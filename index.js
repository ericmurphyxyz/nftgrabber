const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const url = process.argv[2];

if (!url) {
  console.log(`Please enter a URL (e.g. "npm start https://url.xyz").`);
  return;
}

(async () => {
  console.log("Loading...");
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  let currentImage = 1;

  await page.goto(url);
  await page.setViewport({
    width: 1200,
    height: 800,
  });

  await page.waitForSelector(".ReactVirtualized__Grid");

  const pageTitle = await page.title();
  const collection = await pageTitle.split("-").shift().trim();
  if (!fs.existsSync(collection)) {
    fs.mkdirSync(collection);
  }

  page.on("response", async (response) => {
    const imageUrl = response.url();
    if (response.request().resourceType() === "image") {
      response.buffer().then((file) => {
        if (imageUrl.includes("t_preview")) {
          const fileName = imageUrl.split("/").pop();
          const filePath = path.resolve(__dirname, collection, fileName + ".avif");
          const writeStream = fs.createWriteStream(filePath);
          writeStream.write(file);
          console.log(`${collection} #${currentImage} saved to ${collection}/${fileName}.avif`);
          currentImage++;
        }
      });
    }
  });

  await autoScroll(page);

  await page.evaluate(() => {
    const elements = [...document.querySelectorAll("button")];
    const targetElement = elements.find((e) => e.innerText.includes("Load more"));
    targetElement && targetElement.click();
  });

  await autoScroll(page);
  await browser.close();
})();

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      var totalHeight = 0;
      var distance = 1000;
      var timer = setInterval(() => {
        var scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 1000);
    });
  });
}
