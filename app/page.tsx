"use client";

import React, { useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type Product = {
  name: string;
  image: string | null;
  image2?: string | null;
  sku: string | null;
  brand?: string | null;
  variants: { size: string; quantity: number }[];
  infoFields?: string[];
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (!Array.isArray(json)) throw new Error("Invalid JSON format");

      const cleaned = json
        .filter(
          (item) =>
            typeof item.name === "string" &&
            (typeof item.image === "string" || item.image === null || Array.isArray(item.image)) &&
            ("sku" in item)
        )
        .map((item) => ({
          name: item.name,
          image: Array.isArray(item.image) ? item.image[0] : item.image || null,
          image2:
            Array.isArray(item.image) && item.image.length > 1
              ? item.image[1]
              : item.image2 ?? null,
          sku: item.sku ?? null,
          brand: item.brand ?? null,
          variants: ["XS", "S", "M", "L", "XL", "XXL"].map((size) => ({
            size,
            quantity: 0,
          })),
          infoFields: [],
        }));

      setProducts(cleaned);
    } catch (err) {
      console.error("Error parsing file:", err);
      alert("Invalid JSON file. Please select a valid product JSON.");
    }
  };

  const generatePDF = async () => {
    const pdf = new jsPDF("p", "mm", "a4");
    const margin = 10;
    let yOffset = margin;

    const today = new Date().toLocaleDateString("tr-TR");
    const topSectionStart = margin;
    const middleSectionStart = topSectionStart + 45;
    const bottomSectionStart = middleSectionStart + 105;

    const drawTable = (product: Product) => {
      yOffset = bottomSectionStart;
      pdf.setFontSize(20);

      // Set up table drawing colors/styles
      pdf.setDrawColor(255, 0, 0); // Set stroke color to red for testing visibility
      pdf.setLineWidth(1); // Make the border visible
      // pdf.setFillColor(255, 255, 255); // Set background fill to white

      const variantSizes = product.variants.map((v) => v.size.toUpperCase());
      const quantities = product.variants.map((v) => v.quantity);
      const toplam = quantities.reduce((acc, n) => acc + n, 0);

      const cellWidth = 25;
      const totalCellWidth = 35; // "TOPLAM" hücresi için genişlik
      const totalTableWidth = variantSizes.length * cellWidth + totalCellWidth;
      const cellHeight = 10;
      const startX = (210 - margin * 2 - totalTableWidth) / 2 + margin;

      // Draw header row
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.3);
      variantSizes.forEach((size, i) => {
        pdf.rect(startX + i * cellWidth, yOffset, cellWidth, cellHeight, "S");
        pdf.text(`${size}`, startX + i * cellWidth + cellWidth / 2, yOffset + 7, { align: "center" });
      });
      pdf.rect(startX + variantSizes.length * cellWidth, yOffset, totalCellWidth, cellHeight, "S");
      pdf.text("TOPLAM", startX + variantSizes.length * cellWidth + totalCellWidth / 2, yOffset + 7, { align: "center" });

      yOffset += cellHeight;

      // Draw quantity row
      pdf.setDrawColor(0, 0, 0);
      quantities.forEach((qty, i) => {
        pdf.rect(startX + i * cellWidth, yOffset, cellWidth, cellHeight, "S");
        pdf.text(`${qty}`, startX + i * cellWidth + cellWidth / 2, yOffset + 7, { align: "center" });
      });
      pdf.rect(startX + variantSizes.length * cellWidth, yOffset, totalCellWidth, cellHeight, "S");
      pdf.text(`${toplam}`, startX + variantSizes.length * cellWidth + totalCellWidth / 2, yOffset + 7, { align: "center" });

      yOffset += 25;
    };

    const processProductsSequentially = async () => {
      for (let index = 0; index < products.length; index++) {
        const product = products[index];

        if (index > 0) {
          pdf.addPage();
        }

        const drawImageAsync = (imgUrl: string, x: number, y: number): Promise<void> => {
          return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = imgUrl;
            img.onload = () => {
              const canvas = document.createElement("canvas");
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.drawImage(img, 0, 0);
                const imgData = canvas.toDataURL("image/jpeg");
                pdf.addImage(imgData, "JPEG", x, y, 96, 96);
              }
              resolve();
            };
            img.onerror = () => resolve();
          });
        };

        const drawLogoAsync = (): Promise<void> => {
          return new Promise((resolve) => {
            const img = new Image();
            img.src = "/logo.png";
            img.onload = () => {
              const canvas = document.createElement("canvas");
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.drawImage(img, 0, 0);
                const imgData = canvas.toDataURL("image/png");
                pdf.addImage(imgData, "PNG", margin, topSectionStart, 15, 15);
              }
              yOffset = topSectionStart;
              resolve();
            };
            img.onerror = () => resolve();
          });
        };

        const drawContent = () => {
          // Draw date
          pdf.setFontSize(12);
          pdf.text(`DATE: ${today}`, 210 - margin, topSectionStart + 23 , { align: "right" });
          const dateText = `DATE: ${today}`;
          const dateWidth = pdf.getTextWidth(dateText);
          pdf.setDrawColor(0);
          pdf.setLineWidth(0.5);
          pdf.rect(210 - margin - dateWidth - 2, topSectionStart + 18.5, dateWidth + 4, 6);

          pdf.setFontSize(12);
          pdf.text(`COLLECTION: ${product.brand || "BRAND"}`, margin, topSectionStart + 23);
          const brandWidth = pdf.getTextWidth(`COLLECTION: ${product.brand || "BRAND"}`);
          pdf.rect(margin - 2, topSectionStart + 18.5, brandWidth + 4, 6);

          pdf.text(product.name, margin, topSectionStart + 30);
          const nameWidth = pdf.getTextWidth(product.name);
          pdf.rect(margin - 2, topSectionStart + 25.5, nameWidth + 4, 6);

          if (product.image) {
            pdf.setFontSize(16);
            pdf.text("FRONT", margin + 37, topSectionStart + 40);
          }
          if (product.image2) {
            pdf.setFontSize(16);
            pdf.text("BACK", 210 - margin - 40, topSectionStart + 40, { align: "right" });
          }

          yOffset = bottomSectionStart;
          drawTable(product);

          if (product.infoFields && product.infoFields.length > 0) {
            const labelFontSize = 10;
            const labelLineHeight = 6;
            const labelStartX = margin;
            let labelY = yOffset;

            pdf.setFontSize(labelFontSize);
            pdf.setDrawColor(0);
            pdf.setLineWidth(0.2);

            const lines: string[] = [];
            product.infoFields.forEach((entry) => {
              const [key, value] = entry.split(":");
              if (key || value) {
                const line = `${key?.trim() || "—"}: ${value?.trim() || "—"}`;
                lines.push(line);
              }
            });

            const boxHeight = lines.length * labelLineHeight + 4;
            const boxWidth = 170;
            pdf.rect(labelStartX - 2, labelY - 4, boxWidth, boxHeight);

            lines.forEach((line, i) => {
              const y = labelY + i * labelLineHeight;
              pdf.text(line, labelStartX, y);
              pdf.setDrawColor(200);
              pdf.setLineWidth(0.1);
              pdf.line(labelStartX - 2, y + 1.5, labelStartX - 2 + boxWidth, y + 1.5);
            });

            yOffset = labelY + lines.length * labelLineHeight + 6;
          }
        };

        const imageYOffset = middleSectionStart - 20;
        if (product.image) {
          await drawImageAsync(product.image, margin, imageYOffset);
        }
        if (product.image2) {
          await drawImageAsync(product.image2, 210 - margin - 96, imageYOffset);
        }
        await drawLogoAsync();
        drawContent();
      }

      pdf.save("products.pdf");
    };

    if (products.length === 0) {
      alert("No products to export.");
      return;
    }
    await processProductsSequentially();
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById("products-container");
    if (!element) return;

    html2canvas(element).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save("products.pdf");
    });
  };

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#f9f9f9", padding: "2rem", fontFamily: "sans-serif", color: "#111" }}>
      <div style={{ maxWidth: "100%", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "2rem",
          }}
        >
          <img
            src="/logo.png"
            alt="Logo"
            style={{
              height: "48px",
              objectFit: "contain",
              borderRadius: "6px",
              transition: "box-shadow 0.3s ease-in-out, transform 0.2s ease-in-out",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.2)";
              e.currentTarget.style.transform = "scale(1.05)";
              e.currentTarget.style.backgroundColor = "transparent";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          />
          <span
            style={{
              fontSize: "20px",
              fontWeight: "bold",
              marginLeft: "1rem",
              color: "#111",
            }}
          >
            SH Ordersheet Generator
          </span>
        </div>
        {/* <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "1.5rem", textAlign: "center" }}>Product List</h1> */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <label
              htmlFor="file-upload"
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#6ee7b7",
                color: "#065f46",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#4ade80")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#6ee7b7")}
            >
              Dosya Seç
            </label>
            <input
              id="file-upload"
              type="file"
              accept=".json"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            {selectedFileName && (
              <div
                style={{
                  marginLeft: "1rem",
                  backgroundColor: "#e5f7f0",
                  padding: "0.5rem 1rem",
                  borderRadius: "6px",
                  border: "1px solid #34d399",
                  fontSize: "14px",
                  color: "#111",
                  fontWeight: 500,
                }}
              >
                {selectedFileName}
              </div>
            )}
          </div>
          <button
            onClick={generatePDF}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#6ee7b7",
              color: "#065f46",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#4ade80")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#6ee7b7")}
          >
            Generate PDF
          </button>
        </div>
        <div id="products-container">
          <div id="product-list">
            {products.map((product, idx) => {
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: "2rem",
                    border: "1px solid #ccc",
                    borderRadius: "8px",
                    padding: "1.5rem",
                    backgroundColor: "#fff",
                    marginBottom: "1rem",
                    width: "100%",
                    maxWidth: "none",
                    transition: "box-shadow 0.2s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)")}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
                >
                  {/* LEFT: Görseller */}
                  <div style={{ width: "210px", display: "flex", flexDirection: "row", gap: "1rem" }}>
                    {product.image && (
                      <img
                        src={product.image}
                        alt={`${product.name}`}
                        style={{
                          width: "96px",
                          height: "96px",
                          objectFit: "contain",
                          borderRadius: "6px",
                          border: "1px solid #ccc",
                          flexShrink: 0,
                        }}
                      />
                    )}
                    {product.image2 && (
                      <img
                        src={product.image2}
                        alt={`${product.name} (Alt)`}
                        style={{
                          width: "96px",
                          height: "96px",
                          objectFit: "contain",
                          borderRadius: "6px",
                          border: "1px solid #ccc",
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </div>

                  {/* CENTER: Ürün bilgileri */}
                  <div style={{ flex: "0 0 220px", display: "flex", flexDirection: "column", justifyContent: "flex-start" }}>
                    <div
                      style={{
                        fontWeight: "bold",
                        fontSize: "16px",
                        whiteSpace: "nowrap",
                        marginBottom: "0.3rem",
                      }}
                    >
                      {product.name}
                    </div>
                    <div
                      style={{
                        color: "#333",
                        fontStyle: "italic",
                        marginBottom: "0.2rem",
                      }}
                    >
                      {product.brand ?? ""}
                    </div>
                    <div style={{ color: "#333" }}>SKU: {product.sku ?? "N/A"}</div>
                  </div>

                  {/* RIGHT: Varyant tablosu ve infoFields */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    <table style={{ minWidth: "350px", borderCollapse: "collapse", textAlign: "center", marginBottom: "1rem" }}>
                      <thead>
                        <tr>
                          <th style={{ border: "1px solid #ccc", padding: "6px" }}>XS</th>
                          <th style={{ border: "1px solid #ccc", padding: "6px" }}>S</th>
                          <th style={{ border: "1px solid #ccc", padding: "6px" }}>M</th>
                          <th style={{ border: "1px solid #ccc", padding: "6px" }}>L</th>
                          <th style={{ border: "1px solid #ccc", padding: "6px" }}>XL</th>
                          <th style={{ border: "1px solid #ccc", padding: "6px" }}>2XL</th>
                          <th style={{ border: "1px solid #ccc", padding: "6px" }}>TOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {product.variants.map((variant, index) => (
                            <td key={index} style={{ border: "1px solid #ccc", padding: "6px" }}>
                              <input
                                type="number"
                                min={0}
                                value={variant.quantity}
                                onChange={(e) => {
                                  const newProducts = [...products];
                                  newProducts[idx].variants[index].quantity = parseInt(e.target.value) || 0;
                                  setProducts(newProducts);
                                }}
                                style={{
                                  width: "50px",
                                  padding: "0.3rem",
                                  border: "1px solid #ccc",
                                  borderRadius: "6px",
                                  color: "#111",
                                }}
                              />
                            </td>
                          ))}
                          <td style={{ border: "1px solid #ccc", padding: "6px", fontWeight: "bold" }}>
                            {product.variants.reduce((sum, v) => sum + v.quantity, 0)}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <div>
                      <strong>Ek Bilgiler:</strong>
                      {(product.infoFields as string[]).map((field, infoIndex) => (
                        <div
                          key={infoIndex}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            marginTop: "0.5rem",
                          }}
                        >
                          <select
                            value={field.split(":")[0]}
                            onChange={(e) => {
                              const updatedProducts = [...products];
                              const oldValue = updatedProducts[idx].infoFields![infoIndex];
                              const newValue = `${e.target.value}:${oldValue?.split(":")[1] ?? ""}`;
                              updatedProducts[idx].infoFields![infoIndex] = newValue;
                              setProducts(updatedProducts);
                            }}
                            style={{
                              padding: "0.3rem",
                              border: "1px solid #ccc",
                              borderRadius: "6px",
                            }}
                          >
                            <option value="">Bir kategori seçin</option>
                            <option value="Kalip">Kalıp</option>
                            <option value="Kumas Rengi">Kumaş Rengi</option>
                            <option value="Baski Turu">Baskı Türü</option>
                            <option value="Kumas Turu">Kumaş Türü</option>
                          </select>
                          <input
                            type="text"
                            value={field.split(":")[1] || ""}
                            onChange={(e) => {
                              const updatedProducts = [...products];
                              const currentKey = updatedProducts[idx].infoFields![infoIndex].split(":")[0];
                              updatedProducts[idx].infoFields![infoIndex] = `${currentKey}:${e.target.value}`;
                              setProducts(updatedProducts);
                            }}
                            placeholder="Açıklama girin..."
                            style={{
                              flex: 1,
                              padding: "0.3rem",
                              border: "1px solid #ccc",
                              borderRadius: "6px",
                            }}
                          />
                          <button
                            onClick={() => {
                              const updatedProducts = [...products];
                              updatedProducts[idx].infoFields!.splice(infoIndex, 1);
                              setProducts(updatedProducts);
                            }}
                            style={{
                              padding: "0.3rem 0.6rem",
                              backgroundColor: "#f44336",
                              color: "#fff",
                              border: "none",
                              borderRadius: "6px",
                              transition: "background-color 0.2s",
                              cursor: "pointer",
                            }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#b71c1c")}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#f44336")}
                          >
                            Sil
                          </button>
                        </div>
                      ))}

                      {product.infoFields!.length < 6 && (
                        <button
                          onClick={() => {
                            const updatedProducts = [...products];
                            updatedProducts[idx].infoFields!.push(":");
                            setProducts(updatedProducts);
                          }}
                          style={{
                            marginTop: "0.75rem",
                            marginLeft: "1rem",
                            padding: "0.4rem 0.8rem",
                            backgroundColor: "#6ee7b7",
                            color: "#065f46",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "13px",
                            cursor: "pointer",
                            boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
                            transition: "background-color 0.2s",
                          }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#4ade80")}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#6ee7b7")}
                        >
                          + Bilgi Ekle
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}