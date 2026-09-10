CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    profile_name VARCHAR(150) NOT NULL,
    profile_type VARCHAR(20) NOT NULL
        CHECK (profile_type IN ('business', 'personal')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS businesses (
    id SERIAL PRIMARY KEY,
    profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    business_name VARCHAR(255) NOT NULL,
    kra_pin VARCHAR(20) NOT NULL,
    branch_id VARCHAR(20) NOT NULL,
    cmc_key TEXT,
    device_serial VARCHAR(100),
    business_address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS branches (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    branch_id VARCHAR(20) NOT NULL,
    branch_name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    is_main BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (business_id, branch_id)
);

CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    item_code VARCHAR(100) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    unit_price NUMERIC(18,2) DEFAULT 0,
    tax_rate NUMERIC(8,4) DEFAULT 0,
    unit VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (business_id, item_code)
);

CREATE TABLE IF NOT EXISTS purchases (
    id BIGSERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    invoice_number VARCHAR(150),
    supplier_pin VARCHAR(50),
    supplier_name VARCHAR(255),
    transaction_date VARCHAR(50),
    taxable_amount NUMERIC(18,2) DEFAULT 0,
    tax_amount NUMERIC(18,2) DEFAULT 0,
    total_amount NUMERIC(18,2) DEFAULT 0,
    raw_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (business_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS purchase_items (
    id BIGSERIAL PRIMARY KEY,
    purchase_id BIGINT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    item_code VARCHAR(100),
    item_name VARCHAR(255),
    quantity NUMERIC(18,4) DEFAULT 0,
    unit_price NUMERIC(18,2) DEFAULT 0,
    taxable_amount NUMERIC(18,2) DEFAULT 0,
    tax_amount NUMERIC(18,2) DEFAULT 0,
    total_amount NUMERIC(18,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sales (
    id BIGSERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    invoice_number VARCHAR(150),
    customer_pin VARCHAR(50),
    customer_name VARCHAR(255),
    transaction_date VARCHAR(50),
    taxable_amount NUMERIC(18,2) DEFAULT 0,
    tax_amount NUMERIC(18,2) DEFAULT 0,
    total_amount NUMERIC(18,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'completed',
    raw_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (business_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS sale_items (
    id BIGSERIAL PRIMARY KEY,
    sale_id BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES items(id) ON DELETE SET NULL,
    item_code VARCHAR(100),
    item_name VARCHAR(255),
    quantity NUMERIC(18,4) DEFAULT 0,
    unit_price NUMERIC(18,2) DEFAULT 0,
    taxable_amount NUMERIC(18,2) DEFAULT 0,
    tax_amount NUMERIC(18,2) DEFAULT 0,
    total_amount NUMERIC(18,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sync_state (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    sync_type VARCHAR(50) NOT NULL,
    last_req_dt VARCHAR(30),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (business_id, sync_type)
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id
ON profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_businesses_profile_id
ON businesses(profile_id);

CREATE INDEX IF NOT EXISTS idx_branches_business_id
ON branches(business_id);

CREATE INDEX IF NOT EXISTS idx_items_business_id
ON items(business_id);

CREATE INDEX IF NOT EXISTS idx_purchases_business_id
ON purchases(business_id);

CREATE INDEX IF NOT EXISTS idx_sales_business_id
ON sales(business_id);

CREATE INDEX IF NOT EXISTS idx_sync_state_business_id
ON sync_state(business_id);

CREATE OR REPLACE VIEW monthly_dashboard AS
SELECT
    b.id AS business_id,
    TO_CHAR(
        COALESCE(
            NULLIF(p.transaction_date, '')::timestamp,
            p.created_at
        ),
        'YYYY-MM'
    ) AS month,
    COALESCE(SUM(p.total_amount), 0) AS purchase_total,
    0::numeric AS sales_total
FROM businesses b
LEFT JOIN purchases p
    ON p.business_id = b.id
GROUP BY
    b.id,
    TO_CHAR(
        COALESCE(
            NULLIF(p.transaction_date, '')::timestamp,
            p.created_at
        ),
        'YYYY-MM'
    );
