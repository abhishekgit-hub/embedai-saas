import React from "react";

export default function PasswordStrength({ password }) {
  if (!password) return null;

  const criteria = [
    { label: "At least 8 characters", test: (p) => p.length >= 8 },
    { label: "Contains uppercase letter", test: (p) => /[A-Z]/.test(p) },
    { label: "Contains number", test: (p) => /[0-9]/.test(p) },
    { label: "Contains special character", test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
  ];

  const passedCriteria = criteria.filter((c) => c.test(password)).length;
  const strength = passedCriteria <= 1 ? "weak" : passedCriteria <= 2 ? "medium" : "strong";

  const getStrengthColor = () => {
    switch (strength) {
      case "weak":
        return "#ef4444";
      case "medium":
        return "#eab308";
      case "strong":
        return "#22c55e";
      default:
        return "#ccc";
    }
  };

  const getStrengthWidth = () => {
    switch (strength) {
      case "weak":
        return "25%";
      case "medium":
        return "50%";
      case "strong":
        return "100%";
      default:
        return "0%";
    }
  };

  return (
    <div style={{ marginTop: "8px" }}>
      <div
        style={{
          height: "4px",
          backgroundColor: "#e5e7eb",
          borderRadius: "2px",
          overflow: "hidden",
          marginBottom: "8px",
        }}
      >
        <div
          style={{
            height: "100%",
            width: getStrengthWidth(),
            backgroundColor: getStrengthColor(),
            transition: "all 0.3s ease",
          }}
        />
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "12px", color: "#666" }}>
        {criteria.map((criterion, index) => (
          <li key={index} style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
            <span style={{ marginRight: "8px", color: criterion.test(password) ? "#22c55e" : "#ccc" }}>
              {criterion.test(password) ? "✓" : "○"}
            </span>
            {criterion.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
