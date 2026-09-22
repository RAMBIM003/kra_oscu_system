const axios = require("axios");
const pool = require("../config/database");

const KRA_BASE_URL =
    process.env.KRA_BASE_URL ||
    "https://etims-api-sbx.kra.go.ke/etims-api";

function getKraUrl(path) {
    return `${KRA_BASE_URL.replace(/\/$/, "")}/${path}`;
}

async function getBusinessCredentials(businessId, userId) {
    const result = await pool.query(
        `SELECT
            b.id,
            b.business_name,
            b.kra_pin,
            b.branch_id,
            b.cmc_key,
            b.device_serial
         FROM businesses b
         JOIN profiles p ON p.id = b.profile_id
         WHERE b.id = $1
         AND p.user_id = $2`,
        [businessId, userId]
    );

    if (!result.rows.length) {
        const error = new Error("Business not found");
        error.status = 404;
        throw error;
    }

    return result.rows[0];
}

async function postKRA(endpoint, credentials, body) {
    const response = await axios.post(
        getKraUrl(endpoint),
        body,
        {
            headers: {
                "Content-Type": "application/json",
                "tin": credentials.kra_pin,
                "bhfId": credentials.branch_id,
                "cmcKey": credentials.cmc_key
            },
            timeout: 30000
        }
    );

    return response.data;
}

// Core initialization logic, reusable outside of an HTTP request/
// response cycle (e.g. called directly from businessController when
// a business is first connected).
async function initializeBusiness(businessId, userId) {
    const business = await getBusinessCredentials(
        businessId,
        userId
    );

    if (!business.cmc_key) {
        const error = new Error(
            "CMC key is not configured for this business"
        );
        error.status = 400;
        throw error;
    }

    const body = {
        tin: business.kra_pin,
        bhfId: business.branch_id,
        dvcSrlNo:
            business.device_serial ||
            process.env.KRA_SERIAL_NO ||
            ""
    };

    const data = await postKRA(
        "selectInitOsdcInfo",
        business,
        body
    );

    const alreadyInstalled =
        String(data.resultCd) === "902";

    return {
        initialized: alreadyInstalled || String(data.resultCd) === "000",
        kra: data
    };
}

async function initialize(req, res) {
    const { businessId } = req.body;

    if (!businessId) {
        return res.status(400).json({
            success: false,
            message: "businessId is required"
        });
    }

    try {
        const result = await initializeBusiness(
            businessId,
            req.user.id
        );

        res.json({
            success: true,
            initialized: result.initialized,
            kra: result.kra
        });
    } catch (error) {
        if (error.status === 400) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.status(502).json({
            success: false,
            message: "KRA request failed",
            error: error.response?.data || error.message
        });
    }
}

async function getSyncState(businessId, syncType) {
    const result = await pool.query(
        `SELECT last_req_dt
         FROM sync_state
         WHERE business_id = $1
         AND sync_type = $2`,
        [businessId, syncType]
    );

    if (!result.rows.length) {
        await pool.query(
            `INSERT INTO sync_state
                (business_id, sync_type, last_req_dt)
             VALUES ($1, $2, '20000101000000')
             ON CONFLICT DO NOTHING`,
            [businessId, syncType]
        );

        return "20000101000000";
    }

    return result.rows[0].last_req_dt;
}

async function updateSyncState(businessId, syncType, lastReqDt) {
    await pool.query(
        `UPDATE sync_state
         SET last_req_dt = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE business_id = $2
         AND sync_type = $3`,
        [lastReqDt, businessId, syncType]
    );
}

async function getPurchaseState(businessId) {
    return getSyncState(businessId, "purchases");
}

async function updatePurchaseState(businessId, lastReqDt) {
    return updateSyncState(businessId, "purchases", lastReqDt);
}

function extractPurchases(data) {
    if (!data || !data.data) {
        return [];
    }

    if (Array.isArray(data.data)) {
        return data.data;
    }

    if (Array.isArray(data.data.saleList)) {
        return data.data.saleList;
    }

    if (Array.isArray(data.data.purchaseList)) {
        return data.data.purchaseList;
    }

    if (Array.isArray(data.data.salesList)) {
        return data.data.salesList;
    }

    return [];
}

function findLatestRequestDate(records, fallback) {
    let latest = fallback;

    for (const record of records) {
        const candidates = [
            record.regDt,
            record.regDtTime,
            record.salesDt,
            record.rcptDt,
            record.lastReqDt,
            record.resultDt
        ];

        for (const value of candidates) {
            if (value && String(value) > String(latest)) {
                latest = String(value);
            }
        }
    }

    return latest;
}

async function purchases(req, res) {
    const businessId = req.body.businessId;

    if (!businessId) {
        return res.status(400).json({
            success: false,
            message: "businessId is required"
        });
    }

    const business = await getBusinessCredentials(
        businessId,
        req.user.id
    );

    if (!business.cmc_key) {
        return res.status(400).json({
            success: false,
            message: "CMC key is not configured for this business"
        });
    }

    const lastReqDt =
        req.body.lastReqDt ||
        await getPurchaseState(businessId);

    const body = {
        tin: business.kra_pin,
        bhfId: business.branch_id,
        lastReqDt
    };

    try {
        const data = await postKRA(
            "selectTrnsPurchaseSalesList",
            business,
            body
        );

        const records = extractPurchases(data);

        if (records.length > 0) {
            const latest = findLatestRequestDate(
                records,
                lastReqDt
            );

            if (latest !== lastReqDt) {
                await updatePurchaseState(
                    businessId,
                    latest
                );
            }

            await savePurchases(
                businessId,
                records
            );
        }

        // Re-run matching after every sync, whether or not new
        // purchase records came in - a payment captured since the
        // last sync may now be able to match against a purchase
        // that was already pulled.
        const transactionController =
            require("../controllers/transactionController");

        const matchResult =
            await transactionController.runMatching(businessId);

        res.json({
            success: true,
            resultCd: data.resultCd,
            resultMsg: data.resultMsg,
            resultDt: data.resultDt,
            lastReqDt,
            count: records.length,
            purchases: records,
            matched: matchResult.matched
        });
    } catch (error) {
        res.status(502).json({
            success: false,
            message: "KRA purchase request failed",
            error: error.response?.data || error.message
        });
    }
}

async function saveBranches(businessId, records) {
    for (const record of records) {
        const branchId = record.bhfId;

        if (!branchId) {
            continue;
        }

        const addressParts = [
            record.locDesc,
            record.sctrNm,
            record.dstrtNm,
            record.prvncNm
        ].filter(Boolean);

        await pool.query(
            `INSERT INTO branches
                (
                    business_id,
                    branch_id,
                    branch_name,
                    address,
                    phone,
                    email,
                    is_main
                )
             VALUES
                ($1,$2,$3,$4,$5,$6,$7)
             ON CONFLICT (business_id, branch_id)
             DO UPDATE SET
                branch_name = EXCLUDED.branch_name,
                address = EXCLUDED.address,
                phone = EXCLUDED.phone,
                email = EXCLUDED.email,
                is_main = EXCLUDED.is_main`,
            [
                businessId,
                branchId,
                record.bhfNm || `Branch ${branchId}`,
                addressParts.join(", ") || null,
                record.mgrTelNo || null,
                record.mgrEmail || null,
                record.hqYn === "Y"
            ]
        );
    }
}

async function branches(req, res) {
    const businessId = req.body.businessId;

    if (!businessId) {
        return res.status(400).json({
            success: false,
            message: "businessId is required"
        });
    }

    const business = await getBusinessCredentials(
        businessId,
        req.user.id
    );

    if (!business.cmc_key) {
        return res.status(400).json({
            success: false,
            message: "CMC key is not configured for this business"
        });
    }

    const lastReqDt =
        req.body.lastReqDt ||
        await getSyncState(businessId, "branches");

    const body = {
        tin: business.kra_pin,
        bhfId: business.branch_id,
        lastReqDt
    };

    try {
        const data = await postKRA(
            "selectBhfList",
            business,
            body
        );

        const records =
            (data.data && Array.isArray(data.data.bhfList)) ?
                data.data.bhfList :
                [];

        if (records.length > 0) {
            const latest = findLatestRequestDate(
                records,
                lastReqDt
            );

            if (latest !== lastReqDt) {
                await updateSyncState(
                    businessId,
                    "branches",
                    latest
                );
            }

            await saveBranches(businessId, records);
        }

        res.json({
            success: true,
            resultCd: data.resultCd,
            resultMsg: data.resultMsg,
            resultDt: data.resultDt,
            lastReqDt,
            count: records.length,
            branches: records
        });
    } catch (error) {
        res.status(502).json({
            success: false,
            message: "KRA branch request failed",
            error: error.response?.data || error.message
        });
    }
}

async function saveItems(businessId, records) {
    for (const record of records) {
        const itemCode = record.itemCd;

        if (!itemCode) {
            continue;
        }

        await pool.query(
            `INSERT INTO items
                (
                    business_id,
                    item_code,
                    item_name,
                    description,
                    unit_price,
                    tax_rate,
                    unit
                )
             VALUES
                ($1,$2,$3,$4,$5,$6,$7)
             ON CONFLICT (business_id, item_code)
             DO UPDATE SET
                item_name = EXCLUDED.item_name,
                description = EXCLUDED.description,
                unit_price = EXCLUDED.unit_price,
                unit = EXCLUDED.unit`,
            [
                businessId,
                itemCode,
                record.itemNm || itemCode,
                record.itemStdNm || null,
                Number(record.dftPrc || 0) || 0,
                0,
                record.qtyUnitCd || null
            ]
        );
    }
}

async function items(req, res) {
    const businessId = req.body.businessId;

    if (!businessId) {
        return res.status(400).json({
            success: false,
            message: "businessId is required"
        });
    }

    const business = await getBusinessCredentials(
        businessId,
        req.user.id
    );

    if (!business.cmc_key) {
        return res.status(400).json({
            success: false,
            message: "CMC key is not configured for this business"
        });
    }

    const lastReqDt =
        req.body.lastReqDt ||
        await getSyncState(businessId, "items");

    const body = {
        tin: business.kra_pin,
        bhfId: business.branch_id,
        lastReqDt
    };

    try {
        const data = await postKRA(
            "selectItemList",
            business,
            body
        );

        const records =
            (data.data && Array.isArray(data.data.itemList)) ?
                data.data.itemList :
                [];

        if (records.length > 0) {
            const latest = findLatestRequestDate(
                records,
                lastReqDt
            );

            if (latest !== lastReqDt) {
                await updateSyncState(
                    businessId,
                    "items",
                    latest
                );
            }

            await saveItems(businessId, records);
        }

        res.json({
            success: true,
            resultCd: data.resultCd,
            resultMsg: data.resultMsg,
            resultDt: data.resultDt,
            lastReqDt,
            count: records.length,
            items: records
        });
    } catch (error) {
        res.status(502).json({
            success: false,
            message: "KRA item request failed",
            error: error.response?.data || error.message
        });
    }
}

async function savePurchases(businessId, records) {
    for (const record of records) {
        const invoice =
            record.invcNo ||
            record.invoiceNo ||
            record.spplrInvcNo ||
            record.rcptNo ||
            null;

        const supplierName =
            record.spplrNm ||
            record.supplierName ||
            record.sellerName ||
            null;

        const supplierPin =
            record.spplrTin ||
            record.supplierPin ||
            record.sellerTin ||
            null;

        const total =
            Number(
                record.totAmt ??
                record.totalAmount ??
                0
            ) || 0;

        const tax =
            Number(
                record.totTaxAmt ??
                record.taxAmt ??
                record.taxAmount ??
                0
            ) || 0;

        const taxable =
            Number(
                record.totTaxblAmt ??
                record.taxblAmt ??
                record.taxableAmount ??
                0
            ) || 0;

        await pool.query(
            `INSERT INTO purchases
                (
                    business_id,
                    invoice_number,
                    supplier_pin,
                    supplier_name,
                    transaction_date,
                    taxable_amount,
                    tax_amount,
                    total_amount,
                    raw_data
                )
             VALUES
                ($1,$2,$3,$4,$5,$6,$7,$8,$9)
             ON CONFLICT (business_id, invoice_number)
             DO UPDATE SET
                supplier_pin = EXCLUDED.supplier_pin,
                supplier_name = EXCLUDED.supplier_name,
                taxable_amount = EXCLUDED.taxable_amount,
                tax_amount = EXCLUDED.tax_amount,
                total_amount = EXCLUDED.total_amount,
                raw_data = EXCLUDED.raw_data`,
            [
                businessId,
                invoice,
                supplierPin,
                supplierName,
                record.regDt ||
                    record.salesDt ||
                    record.rcptDt ||
                    null,
                taxable,
                tax,
                total,
                JSON.stringify(record)
            ]
        );
    }
}

async function getStoredPurchases(req, res) {
    const result = await pool.query(
        `SELECT
            p.id,
            p.invoice_number,
            p.supplier_pin,
            p.supplier_name,
            p.transaction_date,
            p.taxable_amount,
            p.tax_amount,
            p.total_amount,
            p.created_at
         FROM purchases p
         JOIN businesses b ON b.id = p.business_id
         JOIN profiles pr ON pr.id = b.profile_id
         WHERE p.business_id = $1
         AND pr.user_id = $2
         ORDER BY p.transaction_date DESC NULLS LAST,
                  p.created_at DESC`,
        [req.params.businessId, req.user.id]
    );

    res.json({
        success: true,
        purchases: result.rows
    });
}

async function status(req, res) {
    const businessId = req.params.businessId;

    const business = await getBusinessCredentials(
        businessId,
        req.user.id
    );

    const lastReqDt =
        await getPurchaseState(businessId);

    res.json({
        success: true,
        businessId: business.id,
        businessName: business.business_name,
        kraPin: business.kra_pin,
        branchId: business.branch_id,
        cmcKeyLoaded: Boolean(business.cmc_key),
        deviceSerial: business.device_serial,
        purchaseLastReqDt: lastReqDt
    });
}

module.exports = {
    initialize,
    initializeBusiness,
    purchases,
    branches,
    items,
    getStoredPurchases,
    status
};
