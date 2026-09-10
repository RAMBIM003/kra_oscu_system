const pool = require("../config/database");

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
        branchId,
        cmcKey,
        deviceSerial,
        businessAddress,
        phone,
        email
    } = req.body;

    if (!profileId || !businessName || !kraPin || !branchId) {
        return res.status(400).json({
            success: false,
            message: "Profile, business name, KRA PIN and branch ID are required"
        });
    }

    if (!(await verifyProfile(req, profileId))) {
        return res.status(403).json({
            success: false,
            message: "Access denied"
        });
    }

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
                    email
                )
             VALUES
                ($1,$2,$3,$4,$5,$6,$7,$8,$9)
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
                created_at`,
            [
                profileId,
                businessName.trim(),
                kraPin.trim(),
                branchId.trim(),
                cmcKey || null,
                deviceSerial || null,
                businessAddress || null,
                phone || null,
                email || null
            ]
        );

        const business = businessResult.rows[0];

        await client.query(
            `INSERT INTO branches
                (business_id, branch_id, branch_name, is_main)
             VALUES
                ($1, $2, $3, true)
             ON CONFLICT (business_id, branch_id)
             DO NOTHING`,
            [
                business.id,
                branchId.trim(),
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
