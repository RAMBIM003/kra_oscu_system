const pool = require("../config/database");
const kraService = require("../services/kraService");

async function verifyProfile(req, profileId) {
    const result = await pool.query(
        `SELECT id
         FROM profiles
         WHERE id = $1
         AND user_id = $2`,
        [profileId, req.user.id]
    );

    return result.rows.length > 0;
}

async function getBusinesses(req, res) {
    const result = await pool.query(
        `SELECT
            id,
            profile_id,
            business_name,
            kra_pin,
            branch_id,
            device_serial,
            business_address,
            phone,
            email,
            environment,
            status,
            created_at
         FROM businesses
         WHERE profile_id = $1
         ORDER BY created_at DESC`,
        [req.params.profileId]
    );

    const profile = await verifyProfile(req, req.params.profileId);

    if (!profile) {
        return res.status(403).json({
            success: false,
            message: "Access denied"
        });
    }

    res.json({
        success: true,
        businesses: result.rows
    });
}

async function createBusiness(req, res) {
    const {
        profileId,
        businessName,
        kraPin,
        environment,
        businessAddress,
        phone,
        email
    } = req.body;

    if (!profileId || !businessName || !kraPin) {
        return res.status(400).json({
            success: false,
            message: "Profile, business name and KRA PIN are required"
        });
    }

    const env = (environment || "test").toLowerCase();

    if (env !== "test" && env !== "live") {
        return res.status(400).json({
            success: false,
            message: "Environment must be 'test' or 'live'"
        });
    }

    if (!(await verifyProfile(req, profileId))) {
        return res.status(403).json({
            success: false,
            message: "Access denied"
        });
    }

    // Branch ID, device serial and CMC key are technical KRA
    // integration credentials. They are never collected from the
    // business user in the UI - they come from server-side
    // configuration instead.
    const branchId = process.env.KRA_BRANCH_ID || "00";
    const deviceSerial = process.env.KRA_SERIAL_NO || null;
    const cmcKey = process.env.KRA_CMC_KEY || null;

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const businessResult = await client.query(
            `INSERT INTO businesses
                (
                    profile_id,
                    business_name,
                    kra_pin,
                    branch_id,
                    cmc_key,
                    device_serial,
                    business_address,
                    phone,
                    email,
                    environment,
                    status
                )
             VALUES
                ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
             RETURNING
                id,
                profile_id,
                business_name,
                kra_pin,
                branch_id,
                device_serial,
                business_address,
                phone,
                email,
                environment,
                status,
                created_at`,
            [
                profileId,
                businessName.trim(),
                kraPin.trim(),
                branchId,
                cmcKey,
                deviceSerial,
                businessAddress || null,
                phone || null,
                email || null,
                env,
                cmcKey ? "pending" : "error"
            ]
        );

        let business = businessResult.rows[0];

        await client.query(
            `INSERT INTO branches
                (business_id, branch_id, branch_name, is_main)
             VALUES
                ($1, $2, $3, true)
             ON CONFLICT (business_id, branch_id)
             DO NOTHING`,
            [
                business.id,
                branchId,
                "Main Branch"
            ]
        );

        await client.query(
            `INSERT INTO sync_state
                (business_id, sync_type, last_req_dt)
             VALUES
                ($1, 'purchases', '20000101000000')
             ON CONFLICT (business_id, sync_type)
             DO NOTHING`,
            [business.id]
        );

        await client.query("COMMIT");

        // "Connect Business" means more than saving a row - attempt
        // to actually reach KRA OSCU now, and store the real
        // connection status rather than assuming success.
        if (cmcKey) {
            try {
                const kraResult = await kraService.initializeBusiness(
                    business.id,
                    req.user.id
                );

                const newStatus = kraResult.initialized ? "connected" : "error";

                const updated = await pool.query(
                    `UPDATE businesses
                     SET status = $1
                     WHERE id = $2
                     RETURNING
                        id, profile_id, business_name, kra_pin,
                        branch_id, device_serial, business_address,
                        phone, email, environment, status, created_at`,
                    [newStatus, business.id]
                );

                business = updated.rows[0];
            } catch (kraError) {
                await pool.query(
                    `UPDATE businesses SET status = 'error' WHERE id = $1`,
                    [business.id]
                );

                business.status = "error";
            }
        }

        res.status(201).json({
            success: true,
            business
        });
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

async function getBusiness(req, res) {
    const result = await pool.query(
        `SELECT
            b.id,
            b.profile_id,
            b.business_name,
            b.kra_pin,
            b.branch_id,
            b.device_serial,
            b.business_address,
            b.phone,
            b.email,
            b.environment,
            b.status,
            b.created_at
         FROM businesses b
         JOIN profiles p ON p.id = b.profile_id
         WHERE b.id = $1
         AND p.user_id = $2`,
        [req.params.id, req.user.id]
    );

    if (!result.rows.length) {
        return res.status(404).json({
            success: false,
            message: "Business not found"
        });
    }

    res.json({
        success: true,
        business: result.rows[0]
    });
}

async function deleteBusiness(req, res) {
    const result = await pool.query(
        `DELETE FROM businesses b
         USING profiles p
         WHERE b.id = $1
         AND b.profile_id = p.id
         AND p.user_id = $2
         RETURNING b.id`,
        [req.params.id, req.user.id]
    );

    if (!result.rows.length) {
        return res.status(404).json({
            success: false,
            message: "Business not found"
        });
    }

    res.json({
        success: true,
        message: "Business deleted"
    });
}

module.exports = {
    getBusinesses,
    createBusiness,
    getBusiness,
    deleteBusiness
};
