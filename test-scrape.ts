import puppeteer from "puppeteer";
import fs from 'fs';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const collectedProducts: any[] = [];

  // Dinleyici: JSON dönen network response'larını yakala
  page.on("response", async (response) => {
    try {
      const request = response.request();
      const url = request.url();
      const contentType = response.headers()["content-type"];

      if (contentType && contentType.includes("application/json")) {
        const json = await response.json();

        // İçeriği kontrol edip product içeriyorsa kaydet
        if (json && typeof json === "object") {
          const maybeProduct = JSON.stringify(json).toLowerCase();
          collectedProducts.push({ url, json });
        }
      }
    } catch (err) {
      console.warn("⚠️ JSON response işlenemedi:", err);
    }
  });

  const url = "https://suicidehotlinestudio.com/pages/chiraq";
  console.log("🔍 Sayfa açılıyor:", url);
  await page.goto(url, { waitUntil: "domcontentloaded" });

  console.log("📜 Sayfa scroll edilmeye başlanıyor...");
  let previousHeight = 0;
  let maxScrolls = 20;
  for (let i = 0; i < maxScrolls; i++) {
    const currentHeight = await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
      return document.body.scrollHeight;
    });
    if (currentHeight === previousHeight) break;
    previousHeight = currentHeight;
    await new Promise((res) => setTimeout(res, 1000));
  }

  // Scroll sonrası hover tetiklemesiyle lazy-load olan verileri yakala
  const productCards = await page.$$(".product-card, [data-testid='product-card']");
  for (const card of productCards) {
    try {
      await card.hover();
      await new Promise((res) => setTimeout(res, 1000)); // Hover sonrası veri gelmesi için kısa bekleme
    } catch (e) {
      console.warn("⚠️ Hover başarısız:", e);
    }
  }

  await new Promise((res) => setTimeout(res, 3000)); // Ekstra bekleme
  await browser.close();

  fs.writeFileSync('output.json', JSON.stringify(collectedProducts, null, 2), 'utf-8');

  console.log(JSON.stringify(collectedProducts, null, 2));
})();