const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const url = process.argv[2];

if (!url) {
  console.log(`Please enter a URL (e.g. "npm start https://rarible.com/boredapeyachtclub").`);
  return;
}

(async () => {
  console.log("Loading...");
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

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

  let currentImage = 1;

  page.on("response", async (response) => {
    const imageUrl = response.url();
    if (response.request().resourceType() === "image") {
      response.buffer().then((file) => {
        if (imageUrl.includes("t_image_preview")) {
          const fileName = imageUrl.split("/").pop() + ".avif";
          const filePath = path.resolve(__dirname, collection, fileName);
          const writeStream = fs.createWriteStream(filePath);
          writeStream.write(file);
          console.log(`${collection} #${currentImage} saved to ${collection}/${fileName}`);
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
    await new Promise((resolve) => {
      let totalHeight = 0;
      let distance = 500;
      let timer = setInterval(() => {
        let scrollHeight = document.body.scrollHeight;
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
