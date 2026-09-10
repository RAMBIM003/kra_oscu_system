require("dotenv").config();

const https = require("https");

// ============================================================
// KRA eTIMS CONFIGURATION
// ============================================================

const PIN = process.env.KRA_PIN;
const BRANCH_ID = process.env.KRA_BRANCH_ID;
const CMC_KEY = process.env.KRA_CMC_KEY;
const SERIAL_NO = process.env.KRA_SERIAL_NO;

// Candidate host/path combos to try, in order.
// 1) GavaConnect-style host/path (newer developer portal docs)
// 2) Legacy OSCU spec host/path
const CANDIDATES = [
    {
        label: "GavaConnect (etims-api-sbx)",
        host: "etims-api-sbx.kra.go.ke",
        path: "/etims-api/selectTrnsPurchaseSalesList"
    },
    {
        label: "Legacy OSCU spec (sbx.kra.go.ke)",
        host: "sbx.kra.go.ke",
        path: "/etims-oscu/api/v1/selectTrnsPurchaseSalesList"
    }
];

// ============================================================
// REQUEST PAYLOAD
// ============================================================

const payload = {
    lastReqDt: "20000101000000"
};

// ============================================================
// VALIDATE CONFIGURATION
// ============================================================

if (!PIN || !BRANCH_ID || !CMC_KEY) {
    console.error("\n❌ Missing KRA configuration in .env\n");

    console.error("Required variables:");
    console.error("KRA_PIN=");
    console.error("KRA_BRANCH_ID=");
    console.error("KRA_CMC_KEY=");
    console.error("KRA_SERIAL_NO=\n");

    process.exit(1);
}

// ============================================================
// HELPER: SEND A SINGLE ATTEMPT
// ============================================================

function tryCandidate(candidate) {
    return new Promise((resolve) => {
        const requestData = JSON.stringify(payload);

        const options = {
            hostname: candidate.host,
            path: candidate.path,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(requestData),

                tin: PIN,
                bhfId: BRANCH_ID,
                cmcKey: CMC_KEY
            }
        };

        console.log("----------------------------------------------");
        console.log(`📡 Trying: ${candidate.label}`);
        console.log(`    https://${candidate.host}${candidate.path}`);
        console.log("----------------------------------------------");

        const req = https.request(options, (res) => {
            let responseData = "";

            console.log("HTTP Status:", res.statusCode);

            res.on("data", (chunk) => {
                responseData += chunk;
            });

            res.on("end", () => {
                const result = {
                    candidate,
                    statusCode: res.statusCode,
                    raw: responseData,
                    parsed: null,
                    parseError: null,
                    success: false
                };

                if (!responseData) {
                    console.log("⚠️  Empty response body.\n");
                    resolve(result);
                    return;
                }

                try {
                    result.parsed = JSON.parse(responseData);

                    console.log(JSON.stringify(result.parsed, null, 2));

                    if (result.parsed.resultCd === "000") {
                        result.success = true;
                        console.log("✅ SUCCESS on this endpoint\n");
                    } else {
                        console.log("❌ KRA returned an error result code.");
                        console.log("Result Code:   ", result.parsed.resultCd);
                        console.log("Result Message:", result.parsed.resultMsg, "\n");
                    }
                } catch (error) {
                    result.parseError = error.message;
                    console.log("⚠️  Non-JSON response (likely wrong host/path):\n");
                    console.log(
                        responseData.length > 500
                            ? responseData.slice(0, 500) + "...(truncated)"
                            : responseData
                    );
                    console.log("\nParse error:", error.message, "\n");
                }

                resolve(result);
            });
        });

        req.on("error", (error) => {
            console.error("❌ REQUEST ERROR:", error.message, "\n");
            resolve({
                candidate,
                statusCode: null,
                raw: null,
                parsed: null,
                parseError: error.message,
                success: false,
                networkError: true
            });
        });

        req.write(requestData);
        req.end();
    });
}

// ============================================================
// MAIN: TRY EACH CANDIDATE UNTIL ONE SUCCEEDS
// ============================================================

async function main() {
    console.log("\n==============================================");
    console.log("        KRA eTIMS PURCHASE TEST (with fallback)");
    console.log("==============================================");
    console.log("PIN:        ", PIN);
    console.log("Branch ID:  ", BRANCH_ID);
    console.log("Serial No:  ", SERIAL_NO || "(not set)");
    console.log("Last Req:   ", payload.lastReqDt);
    console.log("==============================================\n");

    const results = [];

    for (const candidate of CANDIDATES) {
        const result = await tryCandidate(candidate);
        results.push(result);

        if (result.success) {
            console.log("==============================================");
            console.log(`🎯 WORKING ENDPOINT FOUND: ${candidate.label}`);
            console.log(`   https://${candidate.host}${candidate.path}`);
            console.log("==============================================");

            const saleList = result.parsed.data?.saleList;
            console.log(
                `🧾 Purchase records returned: ${
                    Array.isArray(saleList) ? saleList.length : 0
                }`
            );
            console.log("==============================================\n");

            return; // stop at first success
        }
    }

    // ============================================================
    // NONE SUCCEEDED — SUMMARY
    // ============================================================

    console.log("==============================================");
    console.log("❌ NO CANDIDATE ENDPOINT SUCCEEDED");
    console.log("==============================================");

    results.forEach((r) => {
        console.log(`\n- ${r.candidate.label}`);
        console.log(`  https://${r.candidate.host}${r.candidate.path}`);
        if (r.networkError) {
            console.log(`  Network error: ${r.parseError}`);
        } else if (r.parseError) {
            console.log(`  HTTP ${r.statusCode} — non-JSON response`);
        } else if (r.parsed) {
            console.log(
                `  HTTP ${r.statusCode} — resultCd ${r.parsed.resultCd}: ${r.parsed.resultMsg}`
            );
        } else {
            console.log(`  HTTP ${r.statusCode} — empty response`);
        }
    });

    console.log("\n==============================================\n");
}

main();