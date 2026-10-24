import React, { useMemo, useState } from "react";
export const money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
export const stockStatus = (p) => (p.qty <= 0 ? ["Out of stock", "out"] : p.qty <= p.min ? ["Low stock", "low"] : ["Available", "in"]);
export const Head = ({ title, children }) => (<div className="top"><h2>{title}</h2><div>{children}</div></div>);
export const Kpi = ({ label, value }) => (<div className="card kpi"><span>{label}</span><b>{value}</b></div>);
const rowsFrom = (children) => React.Children.toArray(children).flatMap((child) => {
  if (!React.isValidElement(child)) return [];
  if (child.type === React.Fragment) return rowsFrom(child.props.children);
  return child.type === "tr" ? [child] : [];
});

const rowText = (row) => {
  const read = (child) => {
    if (child == null || typeof child === "boolean") return "";
    if (typeof child === "string" || typeof child === "number") return String(child);
    if (Array.isArray(child)) return child.map(read).join(" ");
    if (!React.isValidElement(child) || ["button", "input", "select", "textarea"].includes(child.type)) return "";
    return read(child.props.children);
  };
  return read(row.props.children).toLocaleLowerCase();
};

export const Table = ({ head, children }) => {
  const [query, setQuery] = useState("");
  const rows = useMemo(() => rowsFrom(children), [children]);
  const filteredRows = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return term ? rows.filter((row) => rowText(row).includes(term)) : rows;
  }, [query, rows]);
  const fields = head.slice(0, 3).join(", ");

  return (
    <div className="card tw">
      <div className="table-toolbar">
        <input
          className="table-search"
          type="search"
          aria-label={`Search table by ${head.join(", ")}`}
          placeholder={`Search by ${fields}...`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <span className="table-count">{filteredRows.length} of {rows.length} records</span>
      </div>
      <table>
        <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>
          {filteredRows.length ? filteredRows : (
            <tr><td className="table-empty" colSpan={head.length}>
              {rows.length ? "No matching records." : "No records to display."}
            </td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
export const Tag = ({ cls, children }) => <span className={"tag " + cls}>{children}</span>;
export function Modal({ title, onClose, onSave, children, okText = "Save" }) {
  return (
    <div className="ov" onClick={onClose}><div className="md" onClick={(e) => e.stopPropagation()}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>{children}
      <div className="acts"><button onClick={onClose}>{onSave ? "Cancel" : "Close"}</button>{onSave && <button className="p" onClick={onSave}>{okText}</button>}</div>
    </div></div>
  );
}
export const Field = ({ label, ...p }) => (<><label>{label}</label><input {...p} /></>);
