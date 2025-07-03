const puppeteer = require("puppeteer");
const { sendSlotAlertNotification } = require("./sendNotification");

let previousSnapshot = [];
let page;

async function fetchVisaSlots() {
    await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
    await page.waitForSelector("#table_F1Regular tbody tr");

    return await page.evaluate(() => {
        return Array.from(document.querySelectorAll("#table_F1Regular tbody tr")).map(row => {
            const cells = row.querySelectorAll("td");
            return {
                location: cells[0]?.innerText.trim(),
                earliestDate: cells[2]?.innerText.trim(),
                totalDates: parseInt(cells[3]?.innerText.trim() || "0"),
            };
        });
    });
}

function getIncreasedSlots(current, previous) {
    return current.filter(curr => {
        const prev = previous.find(p => p.location === curr.location);
        return prev && curr.totalDates > prev.totalDates && curr.totalDates >= 2;
    });
}

async function monitorVisaSlots() {
    try {
        const currentSnapshot = await fetchVisaSlots();

        if (previousSnapshot.length) {
            const increasedSlots = getIncreasedSlots(currentSnapshot, previousSnapshot);

            if (increasedSlots.length > 0) {
                const message = increasedSlots.map(slot =>
                    `📍 ${slot.location}: ${slot.totalDates} slots (Earliest: ${slot.earliestDate})`
                ).join("\n");

                await sendSlotAlertNotification(message);
            } else {
                console.log("📭 No increase in slots.");
            }
        }

        previousSnapshot = currentSnapshot;
    } catch (err) {
        console.error("❌ Error checking visa slots:", err.message);
    }
}

async function startSlotTracker() {
    const browser = await puppeteer.launch({ headless: "new" });
    page = await browser.newPage();

    await page.goto("https://checkvisaslots.com/latest-us-visa-availability.html", {
        waitUntil: "networkidle2",
        timeout: 60000,
    });

    await monitorVisaSlots(); // initial run
    setInterval(monitorVisaSlots, 5 * 60 * 1000); // every 5 minutes
}

module.exports = startSlotTracker;
