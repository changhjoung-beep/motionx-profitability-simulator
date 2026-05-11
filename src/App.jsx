import { useState } from "react";

const USD_TO_KRW = 1460;

const defaults = {
  // Measured data based on Superbuy invoice
  sourcingPrice: 1.55, // USD per unit
  superbuyService: 0.33, // USD per unit service fee
  intlShipping: 0.26, // USD per unit international shipping
  qty: 50,

  // Korea-side fulfillment costs
  packagingCost: 1000, // KRW per unit
  domesticShipping: 3000, // KRW per unit

  // Platform and payment costs
  platformFee: 11, // %
  pgFee: 3, // %
  returnRate: 7.5, // %
  returnShipBurden: 50, // % seller burden

  // Tax
  tariff: 0, // %
  vat: 10, // %

  // Pricing
  sellingPrice: 25000, // KRW
  targetMargin: 30, // %

  // Advertising
  adRatio: 15, // % of revenue
  cpc: 800, // KRW
  cvr: 2.5, // %
  repurchaseRate: 15, // %
};

const SCENARIOS = [
  { label: "Optimistic", adRatio: 10, cvr: 3.5, color: "#00e5a0" },
  { label: "Base", adRatio: 15, cvr: 2.5, color: "#60a5fa" },
  { label: "Pessimistic", adRatio: 25, cvr: 1.5, color: "#f87171" },
];

function calculateMetrics(d) {
  const sellingKRW = Number(d.sellingPrice);

  // 1. Inventory cost: costs incurred before the product is sold
  const sourcingKRW = Number(d.sourcingPrice) * USD_TO_KRW;
  const serviceKRW = Number(d.superbuyService) * USD_TO_KRW;
  const intlShipKRW = Number(d.intlShipping) * USD_TO_KRW;
  const tariffKRW = sourcingKRW * (Number(d.tariff) / 100);
  const vatKRW = (sourcingKRW + tariffKRW) * (Number(d.vat) / 100);

  const inventoryCost =
    sourcingKRW + serviceKRW + intlShipKRW + tariffKRW + vatKRW;

  // 2. Fulfillment cost: costs incurred when a unit is sold
  const fulfillmentCost =
    Number(d.packagingCost) + Number(d.domesticShipping);

  const cogs = inventoryCost + fulfillmentCost;

  // 3. Variable selling costs
  const platformFeeAmt = sellingKRW * (Number(d.platformFee) / 100);
  const pgFeeAmt = sellingKRW * (Number(d.pgFee) / 100);
  const returnReserve =
    sellingKRW *
    (Number(d.returnRate) / 100) *
    (Number(d.returnShipBurden) / 100);

  const variableCost = platformFeeAmt + pgFeeAmt + returnReserve;

  // 4. Advertising cost
  const adCost = sellingKRW * (Number(d.adRatio) / 100);

  // 5. Profitability
  const contributionBeforeAd = sellingKRW - cogs - variableCost;
  const totalCost = cogs + variableCost + adCost;
  const unitProfit = sellingKRW - totalCost;
  const marginRate = sellingKRW > 0 ? (unitProfit / sellingKRW) * 100 : 0;

  // 6. ROAS logic
  const bepRoas =
    contributionBeforeAd > 0 ? sellingKRW / contributionBeforeAd : Infinity;

  const requiredRoas = adCost > 0 ? sellingKRW / adCost : Infinity;

  // 7. CAC logic
  const cvrDecimal = Number(d.cvr) / 100;
  const cac = cvrDecimal > 0 ? Number(d.cpc) / cvrDecimal : Infinity;

  // 8. LTV estimates
  const repeatMultiplier = 1 + Number(d.repurchaseRate) / 100;
  const revenueLtv = sellingKRW * repeatMultiplier;
  const profitLtv = unitProfit * repeatMultiplier;

  // 9. Batch-level metrics
  const batchRevenue = sellingKRW * Number(d.qty);
  const batchProfit = unitProfit * Number(d.qty);
  const inventoryInvestment = inventoryCost * Number(d.qty);

  // 10. Maximum ad spend ratio to maintain target margin
  const maxAdRatioForTargetMargin = Math.max(
    0,
    (contributionBeforeAd / sellingKRW) * 100 - Number(d.targetMargin)
  );

  // 11. Decision logic
  let decision = "GO";
  let decisionReason =
    "The product meets the target margin and advertising efficiency threshold.";

  if (!Number.isFinite(bepRoas) || unitProfit < 0) {
    decision = "NO-GO";
    decisionReason =
      "The current price cannot cover product, platform, return, and advertising costs.";
  } else if (marginRate < Number(d.targetMargin)) {
    decision = "WAIT";
    decisionReason =
      "The product is profitable, but does not yet meet the target margin threshold.";
  } else if (requiredRoas < bepRoas) {
    decision = "NO-GO";
    decisionReason =
      "The planned ad spend exceeds the break-even advertising threshold.";
  }

  return {
    sourcingKRW,
    serviceKRW,
    intlShipKRW,
    tariffKRW,
    vatKRW,
    inventoryCost,
    fulfillmentCost,
    cogs,
    platformFeeAmt,
    pgFeeAmt,
    returnReserve,
    variableCost,
    adCost,
    contributionBeforeAd,
    totalCost,
    unitProfit,
    marginRate,
    bepRoas,
    requiredRoas,
    cac,
    revenueLtv,
    profitLtv,
    batchRevenue,
    batchProfit,
    inventoryInvestment,
    maxAdRatioForTargetMargin,
    decision,
    decisionReason,
  };
}

function formatNumber(n) {
  if (!Number.isFinite(n)) return "N/A";
  return Math.round(n).toLocaleString("ko-KR");
}

function formatCurrency(n) {
  if (!Number.isFinite(n)) return "N/A";
  return `₩${Math.round(n).toLocaleString("ko-KR")}`;
}

function formatMultiple(n) {
  if (!Number.isFinite(n)) return "N/A";
  return `${n.toFixed(2)}x`;
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
  highlight,
}) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div style={{ marginBottom: "14px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "6px",
        }}
      >
        <span style={{ fontSize: "12px", color: "#94a3b8" }}>{label}</span>
        <span
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: highlight ? "#00e5a0" : "#f1f5f9",
            fontFamily: "'DM Mono', monospace",
          }}
        >
          {typeof value === "number" && value % 1 !== 0
            ? value.toFixed(2)
            : value}
          {unit}
        </span>
      </div>

      <div
        style={{
          position: "relative",
          height: "4px",
          background: "#1e293b",
          borderRadius: "2px",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            width: `${pct}%`,
            height: "100%",
            background: highlight ? "#00e5a0" : "#3b82f6",
            borderRadius: "2px",
            transition: "width 0.1s",
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) =>
            onChange(
              step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value)
            )
          }
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            opacity: 0,
            cursor: "pointer",
            height: "20px",
            top: "-8px",
          }}
        />
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, color = "#f1f5f9", warn }) {
  return (
    <div
      style={{
        background: "#0f172a",
        border: `1px solid ${warn ? "#ef444430" : "#1e293b"}`,
        borderRadius: "10px",
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          color: "#64748b",
          marginBottom: "6px",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "20px",
          fontWeight: 700,
          color,
          fontFamily: "'DM Mono', monospace",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: "11px", color: "#475569", marginTop: "4px" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function DecisionCard({ result }) {
  const colorMap = {
    GO: "#00e5a0",
    WAIT: "#fbbf24",
    "NO-GO": "#f87171",
  };

  return (
    <div
      style={{
        background: "#0f172a",
        border: `1px solid ${colorMap[result.decision]}40`,
        borderRadius: "10px",
        padding: "16px",
        marginBottom: "20px",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          color: "#475569",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: "8px",
        }}
      >
        Decision Output
      </div>
      <div
        style={{
          fontSize: "28px",
          fontWeight: 800,
          color: colorMap[result.decision],
          fontFamily: "'DM Mono', monospace",
          marginBottom: "6px",
        }}
      >
        {result.decision}
      </div>
      <div style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.6 }}>
        {result.decisionReason}
      </div>
    </div>
  );
}

function CostBar({ label, amount, total, color }) {
  const pct = total > 0 ? (amount / total) * 100 : 0;

  return (
    <div style={{ marginBottom: "8px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "3px",
        }}
      >
        <span style={{ fontSize: "12px", color: "#94a3b8" }}>{label}</span>
        <span
          style={{
            fontSize: "12px",
            color: "#f1f5f9",
            fontFamily: "'DM Mono', monospace",
          }}
        >
          {formatCurrency(amount)}{" "}
          <span style={{ color: "#475569" }}>({pct.toFixed(1)}%)</span>
        </span>
      </div>

      <div
        style={{
          height: "3px",
          background: "#1e293b",
          borderRadius: "2px",
        }}
      >
        <div
          style={{
            width: `${Math.min(Math.max(pct, 0), 100)}%`,
            height: "100%",
            background: color,
            borderRadius: "2px",
            transition: "width 0.3s",
          }}
        />
      </div>
    </div>
  );
}

export default function MarginCalculator() {
  const [d, setD] = useState(defaults);
  const [activeTab, setActiveTab] = useState("main");

  const r = calculateMetrics(d);

  const set = (key) => (val) =>
    setD((prev) => ({
      ...prev,
      [key]: val,
    }));

  const marginColor =
    r.marginRate >= d.targetMargin
      ? "#00e5a0"
      : r.marginRate >= 15
      ? "#fbbf24"
      : "#f87171";

  const roasOk = r.requiredRoas >= r.bepRoas;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020817",
        color: "#f1f5f9",
        fontFamily: "'DM Sans', sans-serif",
        padding: "24px 20px",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;600&display=swap"
        rel="stylesheet"
      />

      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "4px",
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#00e5a0",
              boxShadow: "0 0 8px #00e5a0",
            }}
          />
          <span
            style={{
              fontSize: "11px",
              color: "#00e5a0",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontFamily: "'DM Mono', monospace",
            }}
          >
            MotionX
          </span>
        </div>

        <h1
          style={{
            fontSize: "22px",
            fontWeight: 700,
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Advertising Profitability Simulator
        </h1>

        <p
          style={{
            fontSize: "12px",
            color: "#475569",
            margin: "4px 0 0",
            fontFamily: "'DM Mono', monospace",
          }}
        >
          P2040 · Based on measured Superbuy invoice data
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          marginBottom: "20px",
          background: "#0f172a",
          borderRadius: "8px",
          padding: "4px",
        }}
      >
        {[
          ["main", "Margin Analysis"],
          ["scenario", "Scenario Comparison"],
          ["batch", "Batch Profitability"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              flex: 1,
              padding: "8px 4px",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 500,
              transition: "all 0.2s",
              background: activeTab === key ? "#1e293b" : "transparent",
              color: activeTab === key ? "#f1f5f9" : "#475569",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Main Tab */}
      {activeTab === "main" && (
        <div>
          <DecisionCard result={r} />

          {/* Key Metrics */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
              marginBottom: "20px",
            }}
          >
            <MetricCard
              label="Effective Margin"
              value={`${r.marginRate.toFixed(1)}%`}
              color={marginColor}
              sub={
                r.marginRate >= d.targetMargin
                  ? "Target achieved"
                  : `${(d.targetMargin - r.marginRate).toFixed(
                      1
                    )}% below target`
              }
              warn={r.marginRate < 15}
            />

            <MetricCard
              label="Unit Profit"
              value={formatCurrency(r.unitProfit)}
              color={r.unitProfit > 0 ? "#f1f5f9" : "#f87171"}
              sub={`Total cost ${formatCurrency(r.totalCost)}`}
              warn={r.unitProfit < 0}
            />

            <MetricCard
              label="BEP ROAS"
              value={formatMultiple(r.bepRoas)}
              color="#fbbf24"
              sub="Break-even advertising threshold"
            />

            <MetricCard
              label="Required ROAS"
              value={formatMultiple(r.requiredRoas)}
              color={roasOk ? "#60a5fa" : "#f87171"}
              sub={`CAC ${formatCurrency(r.cac)}`}
              warn={!roasOk}
            />

            <MetricCard
              label="Profit LTV"
              value={formatCurrency(r.profitLtv)}
              color={r.profitLtv > 0 ? "#00e5a0" : "#f87171"}
              sub={`Revenue LTV ${formatCurrency(r.revenueLtv)}`}
              warn={r.profitLtv < 0}
            />

            <MetricCard
              label="Max Ad Ratio"
              value={`${r.maxAdRatioForTargetMargin.toFixed(1)}%`}
              color="#fbbf24"
              sub={`To maintain ${d.targetMargin}% margin`}
            />
          </div>

          {/* Cost Breakdown */}
          <div
            style={{
              background: "#0f172a",
              borderRadius: "10px",
              padding: "16px",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                color: "#475569",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "14px",
              }}
            >
              Cost Structure
            </div>

            <CostBar
              label="Sourcing Cost"
              amount={r.sourcingKRW}
              total={d.sellingPrice}
              color="#3b82f6"
            />
            <CostBar
              label="Superbuy Service Fee"
              amount={r.serviceKRW}
              total={d.sellingPrice}
              color="#6366f1"
            />
            <CostBar
              label="International Shipping"
              amount={r.intlShipKRW}
              total={d.sellingPrice}
              color="#8b5cf6"
            />
            <CostBar
              label="VAT"
              amount={r.vatKRW}
              total={d.sellingPrice}
              color="#a855f7"
            />
            <CostBar
              label="Packaging + Domestic Shipping"
              amount={r.fulfillmentCost}
              total={d.sellingPrice}
              color="#ec4899"
            />
            <CostBar
              label="Platform Fee + PG Fee"
              amount={r.platformFeeAmt + r.pgFeeAmt}
              total={d.sellingPrice}
              color="#f97316"
            />
            <CostBar
              label="Return Reserve"
              amount={r.returnReserve}
              total={d.sellingPrice}
              color="#f59e0b"
            />
            <CostBar
              label="Planned Ad Spend"
              amount={r.adCost}
              total={d.sellingPrice}
              color="#ef4444"
            />

            <div
              style={{
                borderTop: "1px solid #1e293b",
                marginTop: "10px",
                paddingTop: "10px",
              }}
            >
              <CostBar
                label="Net Profit"
                amount={Math.max(r.unitProfit, 0)}
                total={d.sellingPrice}
                color="#00e5a0"
              />
            </div>
          </div>

          {/* Sales Controls */}
          <div
            style={{
              background: "#0f172a",
              borderRadius: "10px",
              padding: "16px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                color: "#475569",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "14px",
              }}
            >
              Sales Settings
            </div>

            <Slider
              label="Selling Price"
              value={d.sellingPrice}
              min={10000}
              max={50000}
              step={1000}
              unit=" KRW"
              onChange={set("sellingPrice")}
              highlight
            />

            <Slider
              label="Target Margin"
              value={d.targetMargin}
              min={5}
              max={60}
              step={1}
              unit="%"
              onChange={set("targetMargin")}
              highlight
            />

            <Slider
              label="Platform Fee"
              value={d.platformFee}
              min={3}
              max={20}
              step={1}
              unit="%"
              onChange={set("platformFee")}
            />

            <Slider
              label="Return Rate"
              value={d.returnRate}
              min={0}
              max={20}
              step={0.5}
              unit="%"
              onChange={set("returnRate")}
            />
          </div>

          {/* Advertising Controls */}
          <div
            style={{
              background: "#0f172a",
              borderRadius: "10px",
              padding: "16px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                color: "#475569",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "14px",
              }}
            >
              Advertising Settings
            </div>

            <Slider
              label="Ad Spend Ratio"
              value={d.adRatio}
              min={0}
              max={40}
              step={1}
              unit="%"
              onChange={set("adRatio")}
              highlight
            />

            <Slider
              label="CPC"
              value={d.cpc}
              min={200}
              max={3000}
              step={100}
              unit=" KRW"
              onChange={set("cpc")}
            />

            <Slider
              label="Conversion Rate"
              value={d.cvr}
              min={0.5}
              max={10}
              step={0.1}
              unit="%"
              onChange={set("cvr")}
            />

            <Slider
              label="Repurchase Rate"
              value={d.repurchaseRate}
              min={0}
              max={50}
              step={1}
              unit="%"
              onChange={set("repurchaseRate")}
            />
          </div>
        </div>
      )}

      {/* Scenario Tab */}
      {activeTab === "scenario" && (
        <div>
          <div
            style={{
              background: "#0f172a",
              borderRadius: "10px",
              padding: "16px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                color: "#475569",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "4px",
              }}
            >
              Shared Assumptions
            </div>

            <div
              style={{
                fontSize: "12px",
                color: "#475569",
                marginBottom: "14px",
                fontFamily: "'DM Mono', monospace",
              }}
            >
              Adjust the selling price and compare media efficiency scenarios.
            </div>

            <Slider
              label="Selling Price"
              value={d.sellingPrice}
              min={10000}
              max={50000}
              step={1000}
              unit=" KRW"
              onChange={set("sellingPrice")}
              highlight
            />
          </div>

          {SCENARIOS.map((scenario) => {
            const scenarioData = {
              ...d,
              adRatio: scenario.adRatio,
              cvr: scenario.cvr,
            };

            const sr = calculateMetrics(scenarioData);

            return (
              <div
                key={scenario.label}
                style={{
                  background: "#0f172a",
                  border: `1px solid ${scenario.color}20`,
                  borderRadius: "10px",
                  padding: "16px",
                  marginBottom: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "14px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: scenario.color,
                      }}
                    />
                    <span style={{ fontWeight: 600, fontSize: "14px" }}>
                      {scenario.label} Scenario
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: "11px",
                      color: "#475569",
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    Ad ratio {scenario.adRatio}% · CVR {scenario.cvr}%
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "8px",
                  }}
                >
                  {[
                    [
                      "Decision",
                      sr.decision,
                      sr.decision === "GO"
                        ? true
                        : sr.decision === "WAIT"
                        ? "wait"
                        : false,
                    ],
                    [
                      "Margin",
                      `${sr.marginRate.toFixed(1)}%`,
                      sr.marginRate >= d.targetMargin,
                    ],
                    ["Unit Profit", formatCurrency(sr.unitProfit), sr.unitProfit > 0],
                    ["BEP ROAS", formatMultiple(sr.bepRoas), true],
                    [
                      "Required ROAS",
                      formatMultiple(sr.requiredRoas),
                      sr.requiredRoas >= sr.bepRoas,
                    ],
                    ["CAC", formatCurrency(sr.cac), true],
                    [
                      "Batch Profit",
                      formatCurrency(sr.batchProfit),
                      sr.batchProfit > 0,
                    ],
                  ].map(([label, value, ok]) => (
                    <div
                      key={label}
                      style={{
                        background: "#020817",
                        borderRadius: "8px",
                        padding: "10px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "10px",
                          color: "#475569",
                          marginBottom: "4px",
                        }}
                      >
                        {label}
                      </div>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: 600,
                          color:
                            ok === true
                              ? scenario.color
                              : ok === "wait"
                              ? "#fbbf24"
                              : "#f87171",
                          fontFamily: "'DM Mono', monospace",
                        }}
                      >
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <div
            style={{
              background: "#0f172a",
              borderRadius: "10px",
              padding: "14px",
              marginTop: "4px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                color: "#475569",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Advertising Ceiling Analysis
            </div>

            <div
              style={{
                fontSize: "12px",
                color: "#94a3b8",
                lineHeight: "1.7",
              }}
            >
              Maximum ad spend ratio to maintain{" "}
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  color: "#00e5a0",
                }}
              >
                {d.targetMargin}% margin
              </span>
              :{" "}
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  color: "#fbbf24",
                  fontWeight: 600,
                }}
              >
                {r.maxAdRatioForTargetMargin.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Batch Tab */}
      {activeTab === "batch" && (
        <div>
          <div
            style={{
              background: "#0f172a",
              borderRadius: "10px",
              padding: "16px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                color: "#475569",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "14px",
              }}
            >
              Batch Settings
            </div>

            <Slider
              label="Order Quantity"
              value={d.qty}
              min={10}
              max={500}
              step={10}
              unit=" units"
              onChange={set("qty")}
              highlight
            />

            <Slider
              label="Selling Price"
              value={d.sellingPrice}
              min={10000}
              max={50000}
              step={1000}
              unit=" KRW"
              onChange={set("sellingPrice")}
            />

            <Slider
              label="Ad Spend Ratio"
              value={d.adRatio}
              min={0}
              max={40}
              step={1}
              unit="%"
              onChange={set("adRatio")}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
              marginBottom: "16px",
            }}
          >
            <MetricCard
              label="Total Revenue"
              value={formatCurrency(r.batchRevenue)}
              color="#f1f5f9"
              sub={`${formatNumber(d.qty)} units × ${formatCurrency(
                d.sellingPrice
              )}`}
            />

            <MetricCard
              label="Total Net Profit"
              value={formatCurrency(r.batchProfit)}
              color={r.batchProfit > 0 ? "#00e5a0" : "#f87171"}
              sub={`Unit profit ${formatCurrency(r.unitProfit)}`}
              warn={r.batchProfit < 0}
            />

            <MetricCard
              label="Inventory Investment"
              value={formatCurrency(r.inventoryInvestment)}
              color="#fbbf24"
              sub="Unsold inventory risk basis"
            />

            <MetricCard
              label="Contribution Before Ads"
              value={formatCurrency(r.contributionBeforeAd)}
              color={r.contributionBeforeAd > 0 ? "#60a5fa" : "#f87171"}
              sub="Profit pool before paid media"
              warn={r.contributionBeforeAd <= 0}
            />
          </div>

          {/* Sell-through simulation */}
          <div
            style={{
              background: "#0f172a",
              borderRadius: "10px",
              padding: "16px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                color: "#475569",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "14px",
              }}
            >
              Profit by Sell-through Rate
            </div>

            {[30, 50, 70, 80, 100].map((pct) => {
              const soldQty = Math.round((d.qty * pct) / 100);
              const unsoldQty = d.qty - soldQty;

              const profit =
                r.unitProfit * soldQty - r.inventoryCost * unsoldQty;

              const isOk = profit > 0;

              return (
                <div
                  key={pct}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 0",
                    borderBottom: "1px solid #172033",
                  }}
                >
                  <div
                    style={{
                      width: "36px",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#94a3b8",
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    {pct}%
                  </div>

                  <div
                    style={{
                      flex: 1,
                      height: "4px",
                      background: "#1e293b",
                      borderRadius: "2px",
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: isOk ? "#00e5a0" : "#f87171",
                        borderRadius: "2px",
                      }}
                    />
                  </div>

                  <div style={{ textAlign: "right", minWidth: "110px" }}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: isOk ? "#00e5a0" : "#f87171",
                        fontFamily: "'DM Mono', monospace",
                      }}
                    >
                      {profit > 0 ? "+" : ""}
                      {formatCurrency(profit)}
                    </div>
                    <div style={{ fontSize: "10px", color: "#475569" }}>
                      {soldQty} sold · {unsoldQty} unsold
                    </div>
                  </div>
                </div>
              );
            })}

            <div
              style={{
                marginTop: "14px",
                background: "#020817",
                borderRadius: "8px",
                padding: "12px",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  color: "#475569",
                  marginBottom: "6px",
                }}
              >
                Break-even Sell-through Quantity
              </div>

              <div
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "#fbbf24",
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                {r.unitProfit + r.inventoryCost > 0
                  ? `${Math.ceil(
                      r.inventoryCost * d.qty / (r.unitProfit + r.inventoryCost)
                    )} units`
                  : "N/A"}

                <span
                  style={{
                    fontSize: "12px",
                    color: "#475569",
                    fontWeight: 400,
                    marginLeft: "8px",
                  }}
                >
                  {r.unitProfit + r.inventoryCost > 0
                    ? `(${Math.ceil(
                        (Math.ceil(
                          r.inventoryCost *
                            d.qty /
                            (r.unitProfit + r.inventoryCost)
                        ) /
                          d.qty) *
                          100
                      )}% sell-through)`
                    : "(Not profitable)"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          marginTop: "20px",
          padding: "12px",
          background: "#0f172a",
          borderRadius: "8px",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            color: "#334155",
            lineHeight: "1.6",
            fontFamily: "'DM Mono', monospace",
          }}
        >
          Sourcing ${d.sourcingPrice} · Service ${d.superbuyService} ·
          International shipping ${d.intlShipping} · FX ₩
          {formatNumber(USD_TO_KRW)} · Based on measured Superbuy data
          <br />
          Tariff {d.tariff}% · VAT {d.vat}% · Platform fee {d.platformFee}% ·
          PG fee {d.pgFee}% · Return rate {d.returnRate}%
        </div>
      </div>
    </div>
  );
}