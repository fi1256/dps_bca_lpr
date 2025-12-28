import puppeteer from "puppeteer";
import fs from "fs";

const SOURCE =
  "https://dps.mn.gov/divisions/bca/data-and-reports/agencies-use-lprs-lpr";

const browser = await puppeteer.launch({
  headless: true,
});

const page = await browser.newPage();
await page.goto(SOURCE, { waitUntil: "networkidle2" });

await page.waitForSelector("article button");

const results = await page.evaluate(async () => {
  const out = [];

  const buttons = Array.from(document.querySelectorAll("article button"));

  for (const button of buttons) {
    // Click to expand
    button.scrollIntoView();
    button.click();

    // Allow DOM to update
    await new Promise((r) => setTimeout(r, 300));

    // Assume the content div is the next sibling
    let content = button.nextElementSibling;

    // Skip non-div siblings if necessary
    while (content && content.tagName !== "DIV") {
      content = content.nextElementSibling;
    }

    if (!content) continue;

    const items = Array.from(content.querySelectorAll("li"))
      .map((li) => li.textContent.trim())
      .filter(Boolean);

    const item = {
      buttonText: button.textContent.trim(),
      region: button.textContent
        .replace("Sheriff's Office", "")
        .replace("Police Department", "")
        .replace("Department of Public Safety", "")
        .replace("Public Safety", "")
        .replace("Airport Police", "")
        .trim(),
      items,
    };

    console.log(item);

    out.push(item);
  }

  return out;
});

fs.writeFileSync(
  "ripped.json",
  JSON.stringify(results, null, 2), // pretty-print
  "utf8"
);
