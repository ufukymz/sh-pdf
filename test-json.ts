import { extractProductsFromJson } from "./lib/extractProducts";

// ✅ GÜNCEL buildId
const buildId = "DDbESa_Ib3utk9_Glk_eD";

// ✅ Slug'ı koleksiyon sayfana göre güncelle
const slug = "chiraq"; // veya "essentials", "archive" vs

// ✅ Yeni URL
const url = `https://suicidehotlinestudio.com/_next/data/${buildId}/${slug}.json`;

extractProductsFromJson(url).then((products) => {
  console.log("🟢 Ürünler başarıyla çekildi:");
  console.log(products);
});