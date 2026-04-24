<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>POS-Терминал — МобайлШоп</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource/geologica@5.0.0/index.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource/jetbrains-mono@5.0.0/index.min.css">
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
    --bg: #EDEAE4;
    --bg2: #E3DFD8;
    --bg3: #D6D1C9;
    --surf: #F7F4EF;
    --surf2: #F0EDE7;
    --bdr: #C8C3BA;
    --bdr2: #B0AB9F;
    --tx: #1A1815;
    --tx2: #524B41;
    --tx3: #8C857A;
    --ac: #B83200;
    --ach: #D44000;
    --acbg: #FBF0EB;
    --acd: rgba(184, 50, 0, .12);
    --gn: #1A6040;
    --gnbg: #E0F2E8;
    --rd: #B02020;
    --rdbg: #FBE8E8;
    --am: #A05000;
    --ambg: #FEF2E0;
    --bl: #1048A0;
    --blbg: #EBF2FD;
    --pu: #5828A0;
    --pubg: #F0EBFC;
    --tl: #0A6E68;
    --tlbg: #E0F4F2;
    --s0: 0 1px 2px rgba(26, 24, 21, .05);
    --s1: 0 1px 4px rgba(26, 24, 21, .07), 0 2px 8px rgba(26, 24, 21, .04);
    --s2: 0 4px 16px rgba(26, 24, 21, .09), 0 1px 3px rgba(26, 24, 21, .05);
    --s3: 0 8px 32px rgba(26, 24, 21, .12);
    --s4: 0 20px 60px rgba(26, 24, 21, .18);
    --r1: 4px;
    --r: 8px;
    --r2: 12px;
    --r3: 18px;
    --sbw: 240px;
    --barh: 56px;
    --fn: 'Geologica', system-ui, sans-serif;
    --mo: 'JetBrains Mono', monospace;
    --ez: cubic-bezier(.4, 0, .2, 1);
    --t: .15s;
}

body {
  font-family: var(--fn);
  background: var(--bg);
  color: var(--tx);
  height: 100vh;
  overflow: hidden;
  user-select: none;
}

::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--bdr); border-radius: 3px; }

.app {
  display: grid;
  grid-template-columns: 1fr 400px;
  grid-template-rows: var(--barh) 1fr;
  height: 100vh;
  overflow: hidden;
}

/* Header — фиксированная высота, не расширяется */
.header {
  grid-column: 1 / -1;
  grid-row: 1 / 2;
  height: var(--barh);
  min-height: var(--barh);
  max-height: var(--barh);
  background: var(--surf);
  border-bottom: 1px solid var(--bdr);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  z-index: 100;
  box-shadow: var(--s0);
  flex-shrink: 0;
  overflow: hidden;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 700;
  color: var(--tx);
  flex-shrink: 0;
  white-space: nowrap;
}

.logo svg { width: 28px; height: 28px; flex-shrink: 0; }

.header-center {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  min-width: 0;
}

.shift-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  background: var(--surf2);
  border: 1px solid var(--bdr);
  border-radius: 20px;
  font-size: 12px;
  color: var(--tx2);
  white-space: nowrap;
  flex-shrink: 0;
}

.shift-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--rd);
  flex-shrink: 0;
}

.shift-dot.active { background: var(--gn); box-shadow: 0 0 6px var(--gn); }

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  white-space: nowrap;
}

.header-time {
  font-size: 13px;
  color: var(--tx2);
  font-family: var(--mo);
  flex-shrink: 0;
}

.cashier-name {
  font-size: 12px;
  color: var(--tx2);
  padding: 5px 12px;
  background: var(--surf2);
  border: 1px solid var(--bdr);
  border-radius: 20px;
  white-space: nowrap;
  flex-shrink: 0;
}

.header-btn {
  padding: 6px 14px;
  background: var(--surf2);
  border: 1px solid var(--bdr);
  border-radius: var(--r);
  color: var(--tx2);
  font-size: 12px;
  font-family: var(--fn);
  cursor: pointer;
  transition: all var(--t) var(--ez);
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  flex-shrink: 0;
}

.header-btn:hover { background: var(--bg3); color: var(--tx); border-color: var(--bdr2); }

/* Main */
.main {
  grid-column: 1 / 2;
  grid-row: 2 / 3;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 16px;
  gap: 12px;
  min-height: 0;
}

.toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-shrink: 0;
  flex-wrap: nowrap;
  min-height: 38px;
}

.search-box {
  flex: 1;
  min-width: 180px;
  position: relative;
}

.search-box input {
  width: 100%;
  padding: 9px 14px 9px 38px;
  background: var(--surf);
  border: 1px solid var(--bdr);
  border-radius: var(--r);
  color: var(--tx);
  font-size: 13px;
  font-family: var(--fn);
  outline: none;
  transition: border-color var(--t) var(--ez);
}

.search-box input::placeholder { color: var(--tx3); }
.search-box input:focus { border-color: var(--ac); box-shadow: 0 0 0 3px var(--acd); }

.search-box svg {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: var(--tx3);
  pointer-events: none;
}

.categories {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 2px;
  max-width: 60%;
}

.cat-btn {
  padding: 7px 14px;
  background: var(--surf);
  border: 1px solid var(--bdr);
  border-radius: 20px;
  color: var(--tx2);
  font-size: 12px;
  font-family: var(--fn);
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--t) var(--ez);
  flex-shrink: 0;
}

.cat-btn:hover { border-color: var(--ac); color: var(--tx); }
.cat-btn.active { background: var(--ac); border-color: var(--ac); color: #fff; }

/* Products Grid */
.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(165px, 1fr));
  gap: 10px;
  overflow-y: auto;
  padding-right: 4px;
  flex: 1;
  align-content: start;
  min-height: 0;
}

.product-card {
  background: var(--surf);
  border: 1px solid var(--bdr);
  border-radius: var(--r2);
  padding: 14px;
  cursor: pointer;
  transition: all var(--t) var(--ez);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  box-shadow: var(--s0);
}

.product-card:hover {
  border-color: var(--ac);
  transform: translateY(-2px);
  box-shadow: var(--s2);
}

.product-card:active { transform: scale(0.97); }

.product-icon {
  width: 50px;
  height: 50px;
  background: var(--surf2);
  border: 1px solid var(--bdr);
  border-radius: var(--r);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  flex-shrink: 0;
}

.product-name {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--tx);
}

.product-sku {
  font-size: 10px;
  color: var(--tx3);
  font-family: var(--mo);
}

.product-price {
  font-size: 15px;
  font-weight: 700;
  color: var(--gn);
  margin-top: auto;
  font-family: var(--mo);
}

.product-stock {
  font-size: 10px;
  color: var(--tx3);
}

.product-stock.low { color: var(--rd); }

/* Cart Panel */
.cart-panel {
  grid-column: 2 / 3;
  grid-row: 2 / 3;
  background: var(--surf);
  border-left: 1px solid var(--bdr);
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  box-shadow: -2px 0 8px rgba(26,24,21,.04);
  min-height: 0;
}

.cart-header {
  padding: 14px 18px;
  border-bottom: 1px solid var(--bdr);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.cart-title {
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.cart-count {
  background: var(--ac);
  color: #fff;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
  font-family: var(--mo);
}

.cart-clear {
  background: none;
  border: none;
  color: var(--rd);
  font-size: 12px;
  font-family: var(--fn);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--r1);
  transition: background var(--t);
}

.cart-clear:hover { background: var(--rdbg); }

.cart-items {
  flex: 1;
  overflow-y: auto;
  padding: 6px 0;
  min-height: 0;
}

.cart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--tx3);
  font-size: 13px;
  gap: 10px;
}

.cart-empty svg { width: 44px; height: 44px; opacity: 0.25; }

.cart-item {
  display: flex;
  align-items: center;
  padding: 8px 18px;
  gap: 10px;
  transition: background var(--t);
  animation: slideIn 0.2s ease;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}

.cart-item:hover { background: var(--surf2); }

.cart-item-icon {
  width: 36px;
  height: 36px;
  background: var(--surf2);
  border: 1px solid var(--bdr);
  border-radius: var(--r1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.cart-item-info { flex: 1; min-width: 0; }

.cart-item-name {
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cart-item-price {
  font-size: 11px;
  color: var(--tx3);
  font-family: var(--mo);
}

.cart-item-qty {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}

.qty-btn {
  width: 26px;
  height: 26px;
  border-radius: var(--r1);
  border: 1px solid var(--bdr);
  background: var(--surf2);
  color: var(--tx);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--t);
}

.qty-btn:hover { border-color: var(--ac); background: var(--acbg); }

.qty-value {
  width: 28px;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  font-family: var(--mo);
}

.cart-item-total {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  min-width: 65px;
  text-align: right;
  font-family: var(--mo);
}

.cart-item-remove {
  background: none;
  border: none;
  color: var(--tx3);
  cursor: pointer;
  padding: 3px;
  border-radius: var(--r1);
  transition: all var(--t);
  display: flex;
  flex-shrink: 0;
}

.cart-item-remove:hover { color: var(--rd); background: var(--rdbg); }

/* Cart Footer */
.cart-footer {
  border-top: 1px solid var(--bdr);
  padding: 14px 18px;
  flex-shrink: 0;
}

.cart-totals {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.cart-total-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--tx2);
}

.cart-total-row.grand {
  font-size: 18px;
  font-weight: 700;
  color: var(--tx);
  padding-top: 8px;
  border-top: 1px solid var(--bdr);
}

.cart-total-row.grand .amount { color: var(--gn); font-family: var(--mo); }

.discount-row {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
}

.discount-input {
  flex: 1;
  padding: 7px 10px;
  background: var(--surf2);
  border: 1px solid var(--bdr);
  border-radius: var(--r1);
  color: var(--tx);
  font-size: 12px;
  font-family: var(--mo);
  outline: none;
}

.discount-input:focus { border-color: var(--ac); box-shadow: 0 0 0 3px var(--acd); }

.discount-btn {
  padding: 7px 10px;
  background: var(--surf2);
  border: 1px solid var(--bdr);
  border-radius: var(--r1);
  color: var(--tx2);
  font-size: 12px;
  font-family: var(--fn);
  cursor: pointer;
  transition: all var(--t);
}

.discount-btn:hover { border-color: var(--ac); color: var(--tx); }

.pay-btn {
  width: 100%;
  padding: 12px;
  background: var(--ac);
  border: none;
  border-radius: var(--r);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  font-family: var(--fn);
  cursor: pointer;
  transition: all var(--t) var(--ez);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.pay-btn:hover { background: var(--ach); transform: translateY(-1px); box-shadow: var(--s2); }
.pay-btn:active { transform: scale(0.98); }
.pay-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(26,24,21,0.35);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  transition: all 0.25s var(--ez);
}

.modal-overlay.show { opacity: 1; visibility: visible; }

.modal {
  background: var(--surf);
  border: 1px solid var(--bdr);
  border-radius: var(--r3);
  width: 92%;
  max-width: 560px;
  max-height: 88vh;
  overflow-y: auto;
  box-shadow: var(--s4);
  transform: scale(0.92) translateY(16px);
  transition: transform 0.25s var(--ez);
}

.modal-overlay.show .modal { transform: scale(1) translateY(0); }

.modal-lg { max-width: 800px; }

.modal-header {
  padding: 18px 22px;
  border-bottom: 1px solid var(--bdr);
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  background: var(--surf);
  z-index: 10;
  border-radius: var(--r3) var(--r3) 0 0;
}

.modal-title { font-size: 17px; font-weight: 600; }

.modal-close {
  width: 30px;
  height: 30px;
  border-radius: var(--r);
  border: 1px solid var(--bdr);
  background: var(--surf2);
  color: var(--tx2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all var(--t);
  flex-shrink: 0;
}

.modal-close:hover { background: var(--bg3); color: var(--tx); }

.modal-body { padding: 20px 22px; }

/* Payment Modal */
.payment-amount { text-align: center; margin-bottom: 20px; }
.payment-amount label { font-size: 12px; color: var(--tx3); }
.payment-amount .amount { font-size: 32px; font-weight: 700; color: var(--gn); display: block; margin-top: 4px; font-family: var(--mo); }

.payment-methods { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }

.method-btn {
  padding: 14px;
  background: var(--surf2);
  border: 2px solid var(--bdr);
  border-radius: var(--r);
  color: var(--tx);
  font-size: 13px;
  font-weight: 500;
  font-family: var(--fn);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  transition: all var(--t);
}

.method-btn:hover { border-color: var(--ac); }
.method-btn.active { border-color: var(--ac); background: var(--acbg); }
.method-btn svg { width: 28px; height: 28px; }

.cash-section { display: none; }
.cash-section.show { display: block; }

.cash-input-group { display: flex; gap: 6px; margin-bottom: 12px; }

.cash-input {
  flex: 1;
  padding: 10px 14px;
  background: var(--surf2);
  border: 1px solid var(--bdr);
  border-radius: var(--r);
  color: var(--tx);
  font-size: 18px;
  font-weight: 600;
  text-align: center;
  outline: none;
  font-family: var(--mo);
}

.cash-input:focus { border-color: var(--ac); box-shadow: 0 0 0 3px var(--acd); }

.numpad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 12px; }

.numpad-btn {
  padding: 12px;
  background: var(--surf2);
  border: 1px solid var(--bdr);
  border-radius: var(--r);
  color: var(--tx);
  font-size: 17px;
  font-weight: 500;
  font-family: var(--fn);
  cursor: pointer;
  transition: all var(--t);
}

.numpad-btn:hover { background: var(--bg3); border-color: var(--ac); }
.numpad-btn:active { transform: scale(0.95); }

.quick-cash { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 12px; }

.quick-cash-btn {
  padding: 8px;
  background: var(--surf2);
  border: 1px solid var(--bdr);
  border-radius: var(--r1);
  color: var(--tx);
  font-size: 12px;
  font-weight: 500;
  font-family: var(--mo);
  cursor: pointer;
  transition: all var(--t);
  text-align: center;
}

.quick-cash-btn:hover { border-color: var(--ac); background: var(--acbg); }

.change-display { text-align: center; padding: 10px; background: var(--ambg); border-radius: var(--r); margin-bottom: 14px; }
.change-display label { font-size: 11px; color: var(--tx3); }
.change-display .change-amount { font-size: 22px; font-weight: 700; color: var(--am); display: block; font-family: var(--mo); }

.confirm-pay-btn {
  width: 100%;
  padding: 12px;
  background: var(--gn);
  border: none;
  border-radius: var(--r);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  font-family: var(--fn);
  cursor: pointer;
  transition: all var(--t);
}

.confirm-pay-btn:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: var(--s2); }
.confirm-pay-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

/* Shift Modal */
.shift-info { display: flex; flex-direction: column; gap: 10px; }

.shift-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: var(--surf2);
  border: 1px solid var(--bdr);
  border-radius: var(--r);
}

.shift-stat label { font-size: 12px; color: var(--tx3); }
.shift-stat .value { font-size: 14px; font-weight: 600; font-family: var(--mo); }

.shift-actions { display: flex; gap: 10px; margin-top: 6px; }

.shift-btn {
  flex: 1;
  padding: 11px;
  border-radius: var(--r);
  border: none;
  font-size: 13px;
  font-weight: 600;
  font-family: var(--fn);
  cursor: pointer;
  transition: all var(--t);
}

.shift-btn.open { background: var(--gn); color: #fff; }
.shift-btn.close { background: var(--rd); color: #fff; }
.shift-btn:hover { opacity: 0.9; transform: translateY(-1px); }
.shift-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

/* Tabs */
.tabs {
  display: flex;
  gap: 3px;
  margin-bottom: 14px;
  background: var(--surf2);
  border: 1px solid var(--bdr);
  border-radius: var(--r);
  padding: 3px;
}

.tab-btn {
  flex: 1;
  padding: 7px 10px;
  border: none;
  background: none;
  color: var(--tx3);
  font-size: 12px;
  font-weight: 500;
  font-family: var(--fn);
  cursor: pointer;
  border-radius: var(--r1);
  transition: all var(--t);
}

.tab-btn.active { background: var(--ac); color: #fff; }
.tab-btn:hover:not(.active) { color: var(--tx); background: var(--bg3); }

.tab-content { display: none; }
.tab-content.active { display: block; }

.opening-cash-input { display: flex; gap: 8px; margin-bottom: 14px; align-items: center; }
.opening-cash-input label { font-size: 12px; color: var(--tx2); white-space: nowrap; }

.opening-cash-input input {
  flex: 1;
  padding: 9px 12px;
  background: var(--surf2);
  border: 1px solid var(--bdr);
  border-radius: var(--r1);
  color: var(--tx);
  font-size: 15px;
  font-weight: 600;
  outline: none;
  font-family: var(--mo);
}

.opening-cash-input input:focus { border-color: var(--ac); box-shadow: 0 0 0 3px var(--acd); }

/* Receipt */
.receipt {
  background: #fff;
  color: #333;
  padding: 20px;
  border-radius: var(--r);
  font-family: var(--mo);
  font-size: 11px;
  max-height: 55vh;
  overflow-y: auto;
  border: 1px solid var(--bdr);
}

.receipt-header { text-align: center; margin-bottom: 10px; }
.receipt-header h3 { font-size: 15px; margin-bottom: 3px; }
.receipt-divider { border-top: 1px dashed #bbb; margin: 6px 0; }

.receipt-items table { width: 100%; border-collapse: collapse; }
.receipt-items td { padding: 2px 0; vertical-align: top; }
.receipt-items .item-name { max-width: 150px; }
.receipt-items .item-qty { text-align: center; width: 28px; }
.receipt-items .item-total { text-align: right; width: 65px; }

.receipt-totals .row { display: flex; justify-content: space-between; padding: 2px 0; }
.receipt-totals .grand { font-weight: 700; font-size: 13px; border-top: 1px dashed #bbb; padding-top: 5px; margin-top: 3px; }

.receipt-footer { text-align: center; margin-top: 10px; color: #888; }

.receipt-actions { display: flex; gap: 10px; margin-top: 14px; }

.receipt-actions .btn {
  flex: 1;
  padding: 10px;
  border-radius: var(--r);
  border: none;
  font-size: 13px;
  font-weight: 600;
  font-family: var(--fn);
  cursor: pointer;
  transition: all var(--t);
}

.btn-primary { background: var(--ac); color: #fff; }
.btn-secondary { background: var(--surf2); color: var(--tx); border: 1px solid var(--bdr); }
.btn-primary:hover, .btn-secondary:hover { opacity: 0.9; transform: translateY(-1px); }

.btn-danger { background: var(--rd); color: #fff; }
.btn-danger:hover { opacity: 0.9; }

.btn-success { background: var(--gn); color: #fff; }
.btn-success:hover { opacity: 0.9; }

.btn-sm { padding: 6px 12px; font-size: 11px; border-radius: var(--r1); }

/* Sales Journal */
.sales-journal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  flex-wrap: wrap;
  gap: 8px;
}

.sales-journal-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
  margin-bottom: 16px;
}

.stat-card {
  padding: 12px;
  background: var(--surf2);
  border: 1px solid var(--bdr);
  border-radius: var(--r);
  text-align: center;
}

.stat-card label { font-size: 11px; color: var(--tx3); display: block; margin-bottom: 4px; }
.stat-card .stat-value { font-size: 18px; font-weight: 700; font-family: var(--mo); }
.stat-card.green .stat-value { color: var(--gn); }
.stat-card.amber .stat-value { color: var(--am); }
.stat-card.blue .stat-value { color: var(--bl); }
.stat-card.red .stat-value { color: var(--rd); }

.sales-table-wrapper { overflow-x: auto; }

.sales-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.sales-table th {
  text-align: left;
  padding: 8px 10px;
  background: var(--surf2);
  border: 1px solid var(--bdr);
  color: var(--tx3);
  font-weight: 500;
  font-size: 11px;
  white-space: nowrap;
}

.sales-table td {
  padding: 8px 10px;
  border: 1px solid var(--bdr);
  vertical-align: middle;
}

.sales-table tr:hover td { background: var(--surf2); }

.sales-table .mono { font-family: var(--mo); }
.sales-table .amount { color: var(--gn); font-weight: 600; }
.sales-table .refund-amount { color: var(--rd); font-weight: 600; }

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
}

.badge-cash { background: var(--gnbg); color: var(--gn); }
.badge-card { background: var(--blbg); color: var(--bl); }
.badge-refund { background: var(--rdbg); color: var(--rd); }
.badge-sale { background: var(--gnbg); color: var(--gn); }

.sale-detail-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 200px;
  overflow-y: auto;
  margin: 10px 0;
}

.sale-detail-item {
  display: flex;
  justify-content: space-between;
  padding: 6px 10px;
  background: var(--surf2);
  border-radius: var(--r1);
  font-size: 12px;
}

.sale-detail-item .sdi-name { flex: 1; }
.sale-detail-item .sdi-qty { width: 30px; text-align: center; color: var(--tx3); }
.sale-detail-item .sdi-total { width: 80px; text-align: right; font-family: var(--mo); font-weight: 600; }

/* Refund Modal */
.refund-sale-info {
  padding: 12px;
  background: var(--surf2);
  border: 1px solid var(--bdr);
  border-radius: var(--r);
  margin-bottom: 14px;
}

.refund-sale-info .rsi-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  padding: 3px 0;
}

.refund-sale-info .rsi-row label { color: var(--tx3); }
.refund-sale-info .rsi-row span { font-weight: 600; font-family: var(--mo); }

.refund-items-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.refund-item-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: var(--surf2);
  border: 1px solid var(--bdr);
  border-radius: var(--r1);
  font-size: 12px;
}

.refund-item-row .fri-name { flex: 1; min-width: 0; }
.refund-item-row .fri-price { font-family: var(--mo); color: var(--tx2); width: 70px; text-align: right; flex-shrink: 0; }

.refund-qty-ctrl {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}

.refund-qty-ctrl .rq-btn {
  width: 24px;
  height: 24px;
  border-radius: var(--r1);
  border: 1px solid var(--bdr);
  background: var(--surf);
  color: var(--tx);
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--t);
}

.rq-btn:hover { border-color: var(--ac); background: var(--acbg); }

.refund-qty-ctrl .rq-val {
  width: 24px;
  text-align: center;
  font-family: var(--mo);
  font-weight: 600;
  font-size: 13px;
}

.refund-total-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background: var(--rdbg);
  border: 1px solid var(--rd);
  border-radius: var(--r);
  margin-bottom: 14px;
}

.refund-total-bar label { font-size: 13px; color: var(--rd); font-weight: 600; }
.refund-total-bar .rt-amount { font-size: 20px; font-weight: 700; color: var(--rd); font-family: var(--mo); }

.refund-reason {
  width: 100%;
  padding: 10px 12px;
  background: var(--surf2);
  border: 1px solid var(--bdr);
  border-radius: var(--r1);
  color: var(--tx);
  font-size: 12px;
  font-family: var(--fn);
  outline: none;
  resize: vertical;
  min-height: 60px;
  margin-bottom: 14px;
}

.refund-reason:focus { border-color: var(--ac); box-shadow: 0 0 0 3px var(--acd); }

/* Notification */
.notification {
  position: fixed;
  top: calc(var(--barh) + 12px);
  right: 20px;
  padding: 10px 18px;
  background: var(--surf);
  border: 1px solid var(--bdr);
  border-radius: var(--r);
  box-shadow: var(--s3);
  font-size: 13px;
  z-index: 2000;
  transform: translateX(120%);
  transition: transform 0.3s var(--ez);
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 360px;
}

.notification.show { transform: translateX(0); }
.notification.success { border-left: 3px solid var(--gn); }
.notification.error { border-left: 3px solid var(--rd); }
.notification.info { border-left: 3px solid var(--bl); }
.notification.warning { border-left: 3px solid var(--am); }

/* Sales list in shift modal */
.sales-list { display: flex; flex-direction: column; gap: 6px; max-height: 45vh; overflow-y: auto; }

.sale-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--surf2);
  border: 1px solid var(--bdr);
  border-radius: var(--r1);
  font-size: 12px;
}

.sale-item .sale-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.sale-item .sale-time { color: var(--tx3); font-size: 10px; font-family: var(--mo); }
.sale-item .sale-amount { font-weight: 600; color: var(--gn); font-family: var(--mo); white-space: nowrap; }
.sale-item .sale-amount.refunded { color: var(--rd); text-decoration: line-through; }

/* Filter bar for journal */
.journal-filters {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.journal-filters input[type="date"] {
  padding: 6px 10px;
  background: var(--surf2);
  border: 1px solid var(--bdr);
  border-radius: var(--r1);
  color: var(--tx);
  font-size: 12px;
  font-family: var(--fn);
  outline: none;
}

.journal-filters input[type="date"]:focus { border-color: var(--ac); }

.journal-search {
  flex: 1;
  min-width: 150px;
  padding: 6px 10px;
  background: var(--surf2);
  border: 1px solid var(--bdr);
  border-radius: var(--r1);
  color: var(--tx);
  font-size: 12px;
  font-family: var(--fn);
  outline: none;
}

.journal-search:focus { border-color: var(--ac); }

/* Responsive */
@media (max-width: 900px) {
  .app { grid-template-columns: 1fr; grid-template-rows: var(--barh) 1fr; }
  .cart-panel { display: none; }
  .products-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
  .categories { max-width: 50%; }
  .cashier-name { display: none; }
}

@keyframes pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.25); }
  100% { transform: scale(1); }
}

.pop { animation: pop 0.2s ease; }

mark { background: var(--acbg); color: var(--ac); padding: 0 2px; border-radius: 2px; }
</style>
</head>
<body>

<div class="app">
  <header class="header">
    <div class="logo">
      <svg viewBox="0 0 32 32" fill="none">
        <rect x="4" y="2" width="24" height="28" rx="4" stroke="#B83200" stroke-width="2"/>
        <rect x="8" y="6" width="16" height="14" rx="2" fill="#B83200" opacity="0.15"/>
        <circle cx="16" cy="25" r="2" fill="#B83200"/>
      </svg>
      МобайлШоп POS
    </div>
    <div class="header-center">
      <div class="shift-status">
        <span class="shift-dot" id="shiftDot"></span>
        <span id="shiftStatusText">Смена закрыта</span>
      </div>
    </div>
    <div class="header-right">
      <span class="cashier-name">👤 Иванов А.</span>
      <button class="header-btn" onclick="openShiftModal()">🔧 Смена</button>
      <button class="header-btn" onclick="openJournalModal()">📋 Журнал</button>
      <span class="header-time" id="headerTime">--:--:--</span>
    </div>
  </header>

  <main class="main">
    <div class="toolbar">
      <div class="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" id="searchInput" placeholder="Поиск по названию или артикулу..." oninput="filterProducts()">
      </div>
      <div class="categories" id="categories"></div>
    </div>
    <div class="products-grid" id="productsGrid"></div>
  </main>

  <aside class="cart-panel">
    <div class="cart-header">
      <div class="cart-title">🛒 Корзина <span class="cart-count" id="cartCount">0</span></div>
      <button class="cart-clear" onclick="clearCart()">Очистить</button>
    </div>
    <div class="cart-items" id="cartItems">
      <div class="cart-empty" id="cartEmpty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
        Корзина пуста
      </div>
    </div>
    <div class="cart-footer">
      <div class="cart-totals">
        <div class="cart-total-row"><span>Товаров:</span><span id="totalItems">0 шт.</span></div>
        <div class="cart-total-row"><span>Подитог:</span><span id="subtotal">0 ₽</span></div>
        <div class="cart-total-row" id="discountRow" style="display:none;"><span>Скидка:</span><span id="discountAmount" style="color:var(--rd)">-0 ₽</span></div>
        <div class="cart-total-row grand"><span>Итого:</span><span class="amount" id="grandTotal">0 ₽</span></div>
      </div>
      <div class="discount-row">
        <input type="number" class="discount-input" id="discountInput" placeholder="Скидка %" min="0" max="100" oninput="updateCart()">
        <button class="discount-btn" onclick="applyDiscount()">%</button>
      </div>
      <button class="pay-btn" id="payBtn" onclick="openPaymentModal()" disabled>💳 Оплата</button>
    </div>
  </aside>
</div>

<!-- Payment Modal -->
<div class="modal-overlay" id="paymentModal">
  <div class="modal">
    <div class="modal-header">
      <span class="modal-title">Оплата</span>
      <button class="modal-close" onclick="closeModal('paymentModal')">✕</button>
    </div>
    <div class="modal-body">
      <div class="payment-amount">
        <label>К оплате</label>
        <span class="amount" id="paymentAmount">0 ₽</span>
      </div>
      <div class="payment-methods">
        <button class="method-btn active" onclick="selectPaymentMethod('cash')" id="methodCash">
          <svg viewBox="0 0 32 32" fill="none"><rect x="2" y="8" width="28" height="16" rx="3" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="16" r="4" stroke="currentColor" stroke-width="2"/></svg>
          Наличные
        </button>
        <button class="method-btn" onclick="selectPaymentMethod('card')" id="methodCard">
          <svg viewBox="0 0 32 32" fill="none"><rect x="2" y="6" width="28" height="20" rx="3" stroke="currentColor" stroke-width="2"/><rect x="2" y="12" width="28" height="4" fill="currentColor" opacity="0.15"/></svg>
          Карта
        </button>
      </div>
      <div class="cash-section show" id="cashSection">
        <div class="cash-input-group">
          <input type="text" class="cash-input" id="cashReceived" placeholder="0" oninput="calculateChange()">
        </div>
        <div class="numpad" id="numpad"></div>
        <div class="quick-cash" id="quickCash"></div>
        <div class="change-display">
          <label>Сдача</label>
          <span class="change-amount" id="changeAmount">0 ₽</span>
        </div>
      </div>
      <button class="confirm-pay-btn" id="confirmPayBtn" onclick="processPayment()">✓ Подтвердить оплату</button>
    </div>
  </div>
</div>

<!-- Shift Modal -->
<div class="modal-overlay" id="shiftModal">
  <div class="modal">
    <div class="modal-header">
      <span class="modal-title">Управление сменой</span>
      <button class="modal-close" onclick="closeModal('shiftModal')">✕</button>
    </div>
    <div class="modal-body">
      <div class="tabs">
        <button class="tab-btn active" onclick="switchTab('shiftOpen','shiftModal')">Открыть</button>
        <button class="tab-btn" onclick="switchTab('shiftInfo','shiftModal')">Информация</button>
        <button class="tab-btn" onclick="switchTab('shiftSales','shiftModal')">Продажи смены</button>
      </div>
      <div class="tab-content active" id="shiftOpen">
        <div class="opening-cash-input">
          <label>Начальная сумма в кассе:</label>
          <input type="number" id="openingCash" value="5000" min="0">
        </div>
        <button class="shift-btn open" onclick="openShift()" id="openShiftBtn">▶ Открыть смену</button>
      </div>
      <div class="tab-content" id="shiftInfo">
        <div class="shift-info">
          <div class="shift-stat"><label>Статус:</label><span class="value" id="infoStatus">Закрыта</span></div>
          <div class="shift-stat"><label>Время открытия:</label><span class="value" id="infoOpenTime">—</span></div>
          <div class="shift-stat"><label>Начальная сумма:</label><span class="value" id="infoOpeningCash">—</span></div>
          <div class="shift-stat"><label>Продаж:</label><span class="value" id="infoSalesCount">0</span></div>
          <div class="shift-stat"><label>Выручка (нал.):</label><span class="value" id="infoCashRevenue">0 ₽</span></div>
          <div class="shift-stat"><label>Выручка (карта):</label><span class="value" id="infoCardRevenue">0 ₽</span></div>
          <div class="shift-stat"><label>Общая выручка:</label><span class="value" id="infoTotalRevenue" style="color:var(--gn)">0 ₽</span></div>
          <div class="shift-stat"><label>Возвраты:</label><span class="value" id="infoRefunds" style="color:var(--rd)">0 ₽</span></div>
          <div class="shift-stat"><label>Ожидается в кассе:</label><span class="value" id="infoExpectedCash" style="color:var(--am)">0 ₽</span></div>
          <div class="shift-actions">
            <button class="shift-btn close" onclick="closeShift()" id="closeShiftBtn" disabled>⏹ Закрыть смену</button>
          </div>
        </div>
      </div>
      <div class="tab-content" id="shiftSales">
        <div class="sales-list" id="shiftSalesList">
          <div class="cart-empty" style="height:200px;"><span style="color:var(--tx3)">Нет продаж за смену</span></div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Receipt Modal -->
<div class="modal-overlay" id="receiptModal">
  <div class="modal" style="max-width:400px;">
    <div class="modal-header">
      <span class="modal-title">Чек</span>
      <button class="modal-close" onclick="closeModal('receiptModal')">✕</button>
    </div>
    <div class="modal-body">
      <div class="receipt" id="receiptContent"></div>
      <div class="receipt-actions">
        <button class="btn btn-secondary" onclick="closeModal('receiptModal')">Закрыть</button>
        <button class="btn btn-primary" onclick="printReceipt()">🖨 Печать</button>
      </div>
    </div>
  </div>
</div>

<!-- Sales Journal Modal -->
<div class="modal-overlay" id="journalModal">
  <div class="modal modal-lg">
    <div class="modal-header">
      <span class="modal-title">📋 Журнал продаж</span>
      <button class="modal-close" onclick="closeModal('journalModal')">✕</button>
    </div>
    <div class="modal-body">
      <div class="sales-journal-stats" id="journalStats"></div>
      <div class="journal-filters">
        <input type="date" id="journalDateFrom" onchange="renderJournal()">
        <span style="color:var(--tx3);font-size:12px;">—</span>
        <input type="date" id="journalDateTo" onchange="renderJournal()">
        <input type="text" class="journal-search" id="journalSearch" placeholder="Поиск по чеку..." oninput="renderJournal()">
        <button class="header-btn" onclick="resetJournalFilters()">↺ Сброс</button>
      </div>
      <div class="sales-table-wrapper">
        <table class="sales-table" id="journalTable">
          <thead>
            <tr>
              <th>Чек</th>
              <th>Дата / Время</th>
              <th>Товары</th>
              <th>Оплата</th>
              <th>Сумма</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody id="journalBody"></tbody>
        </table>
      </div>
    </div>
  </div>
</div>

<!-- Sale Detail Modal -->
<div class="modal-overlay" id="saleDetailModal">
  <div class="modal">
    <div class="modal-header">
      <span class="modal-title" id="saleDetailTitle">Детали продажи</span>
      <button class="modal-close" onclick="closeModal('saleDetailModal')">✕</button>
    </div>
    <div class="modal-body" id="saleDetailBody"></div>
  </div>
</div>

<!-- Refund Modal -->
<div class="modal-overlay" id="refundModal">
  <div class="modal">
    <div class="modal-header">
      <span class="modal-title">↩ Возврат товара</span>
      <button class="modal-close" onclick="closeModal('refundModal')">✕</button>
    </div>
    <div class="modal-body" id="refundBody"></div>
  </div>
</div>

<!-- Notification -->
<div class="notification" id="notification"></div>

<script>
// ==================== DATA ====================
const products = [
  { id: 1, name: 'iPhone 15 Pro 256GB', sku: 'APL-IP15P-256', price: 129990, category: 'phones', icon: '📱', stock: 12 },
  { id: 2, name: 'iPhone 15 128GB', sku: 'APL-IP15-128', price: 89990, category: 'phones', icon: '📱', stock: 18 },
  { id: 3, name: 'Samsung Galaxy S24 Ultra', sku: 'SAM-GS24U', price: 119990, category: 'phones', icon: '📱', stock: 8 },
  { id: 4, name: 'Samsung Galaxy S24', sku: 'SAM-GS24', price: 74990, category: 'phones', icon: '📱', stock: 15 },
  { id: 5, name: 'Xiaomi 14 Pro', sku: 'XIA-14P', price: 59990, category: 'phones', icon: '📱', stock: 22 },
  { id: 6, name: 'Xiaomi Redmi Note 13', sku: 'XIA-RN13', price: 19990, category: 'phones', icon: '📱', stock: 35 },
  { id: 7, name: 'Google Pixel 8 Pro', sku: 'GOO-P8P', price: 84990, category: 'phones', icon: '📱', stock: 6 },
  { id: 8, name: 'Honor Magic 6 Pro', sku: 'HON-M6P', price: 69990, category: 'phones', icon: '📱', stock: 10 },
  { id: 9, name: 'Realme GT 5 Pro', sku: 'REA-GT5P', price: 44990, category: 'phones', icon: '📱', stock: 14 },
  { id: 10, name: 'POCO X6 Pro', sku: 'POC-X6P', price: 27990, category: 'phones', icon: '📱', stock: 20 },
  { id: 11, name: 'Чехол силикон iPhone 15', sku: 'CAS-IP15-SI', price: 1490, category: 'cases', icon: '🛡️', stock: 50 },
  { id: 12, name: 'Чехол кожа iPhone 15 Pro', sku: 'CAS-IP15P-LE', price: 3990, category: 'cases', icon: '🛡️', stock: 25 },
  { id: 13, name: 'Чехол Samsung S24 Ultra', sku: 'CAS-GS24U', price: 1990, category: 'cases', icon: '🛡️', stock: 40 },
  { id: 14, name: 'Чехол противоударный', sku: 'CAS-UNI-SH', price: 2490, category: 'cases', icon: '🛡️', stock: 30 },
  { id: 15, name: 'Чехол прозрачный универс.', sku: 'CAS-UNI-CL', price: 790, category: 'cases', icon: '🛡️', stock: 80 },
  { id: 16, name: 'Чехол-книжка Xiaomi', sku: 'CAS-XIA-BK', price: 1290, category: 'cases', icon: '🛡️', stock: 35 },
  { id: 17, name: 'Зарядка USB-C 65W', sku: 'CHR-UC65', price: 2990, category: 'chargers', icon: '🔌', stock: 45 },
  { id: 18, name: 'Зарядка MagSafe 15W', sku: 'CHR-MS15', price: 4990, category: 'chargers', icon: '🔌', stock: 20 },
  { id: 19, name: 'Беспроводная зарядка Qi', sku: 'CHR-QI10', price: 1990, category: 'chargers', icon: '🔌', stock: 35 },
  { id: 20, name: 'Автомобильная зарядка 30W', sku: 'CHR-CAR30', price: 1490, category: 'chargers', icon: '🔌', stock: 40 },
  { id: 21, name: 'Кабель USB-C — Lightning', sku: 'CBL-UCLT', price: 990, category: 'chargers', icon: '🔌', stock: 60 },
  { id: 22, name: 'Кабель USB-C 2м', sku: 'CBL-UC2M', price: 690, category: 'chargers', icon: '🔌', stock: 75 },
  { id: 23, name: 'Power Bank 20000mAh', sku: 'PWR-20K', price: 3490, category: 'chargers', icon: '🔋', stock: 25 },
  { id: 24, name: 'Power Bank 10000mAh', sku: 'PWR-10K', price: 1990, category: 'chargers', icon: '🔋', stock: 40 },
  { id: 25, name: 'AirPods Pro 2', sku: 'APH-PRO2', price: 24990, category: 'headphones', icon: '🎧', stock: 15 },
  { id: 26, name: 'AirPods 3', sku: 'APH-GEN3', price: 16990, category: 'headphones', icon: '🎧', stock: 20 },
  { id: 27, name: 'Samsung Galaxy Buds FE', sku: 'SGB-FE', price: 7990, category: 'headphones', icon: '🎧', stock: 25 },
  { id: 28, name: 'Xiaomi Buds 4 Pro', sku: 'XIA-B4P', price: 8990, category: 'headphones', icon: '🎧', stock: 18 },
  { id: 29, name: 'JBL Tune 770NC', sku: 'JBL-T770', price: 6990, category: 'headphones', icon: '🎧', stock: 12 },
  { id: 30, name: 'Наушники проводные Type-C', sku: 'EPH-UC', price: 990, category: 'headphones', icon: '🎧', stock: 50 },
  { id: 31, name: 'Стекло iPhone 15 Pro', sku: 'GLS-IP15P', price: 990, category: 'glass', icon: '🔲', stock: 60 },
  { id: 32, name: 'Стекло Samsung S24 Ultra', sku: 'GLS-GS24U', price: 990, category: 'glass', icon: '🔲', stock: 50 },
  { id: 33, name: 'Стекло Xiaomi универс.', sku: 'GLS-XIA-U', price: 590, category: 'glass', icon: '🔲', stock: 80 },
  { id: 34, name: 'Плёнка гидрогелевая', sku: 'FLM-HYDRO', price: 790, category: 'glass', icon: '🔲', stock: 45 },
  { id: 35, name: 'Держатель в авто магнитный', sku: 'HLD-CAR-MG', price: 1490, category: 'accessories', icon: '📎', stock: 30 },
  { id: 36, name: 'Штатив для телефона', sku: 'TRP-PHONE', price: 1990, category: 'accessories', icon: '📎', stock: 20 },
  { id: 37, name: 'Кольцо-держатель PopSocket', sku: 'POP-RING', price: 690, category: 'accessories', icon: '📎', stock: 55 },
  { id: 38, name: 'Стилус универсальный', sku: 'STL-UNI', price: 1290, category: 'accessories', icon: '✏️', stock: 25 },
  { id: 39, name: 'Карта памяти microSD 128GB', sku: 'MEM-MC128', price: 1490, category: 'accessories', icon: '💾', stock: 40 },
  { id: 40, name: 'SIM-адаптер набор', sku: 'SIM-ADP', price: 290, category: 'accessories', icon: '📋', stock: 100 },
];

const categories = [
  { id: 'all', name: 'Все товары', icon: '🏪' },
  { id: 'phones', name: 'Смартфоны', icon: '📱' },
  { id: 'cases', name: 'Чехлы', icon: '🛡️' },
  { id: 'chargers', name: 'Зарядки', icon: '🔌' },
  { id: 'headphones', name: 'Наушники', icon: '🎧' },
  { id: 'glass', name: 'Стёкла', icon: '🔲' },
  { id: 'accessories', name: 'Аксессуары', icon: '📎' },
];

// ==================== STATE ====================
let cart = [];
let currentCategory = 'all';
let searchQuery = '';
let discountPercent = 0;
let shiftActive = false;
let shiftInfo = null;
let allSales = [];
let allRefunds = [];
let selectedPaymentMethod = 'cash';
let receiptNum = 0;
let currentRefundSaleId = null;
let refundQuantities = {};

// ==================== INIT ====================
function init() {
  renderCategories();
  renderProducts();
  renderNumpad();
  updateClock();
  setInterval(updateClock, 1000);
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('journalDateFrom').value = today;
  document.getElementById('journalDateTo').value = today;
}

function updateClock() {
  const now = new Date();
  document.getElementById('headerTime').textContent = now.toLocaleTimeString('ru-RU');
}

// ==================== CATEGORIES ====================
function renderCategories() {
  document.getElementById('categories').innerHTML = categories.map(c =>
    `<button class="cat-btn ${c.id === currentCategory ? 'active' : ''}" onclick="selectCategory('${c.id}')">${c.icon} ${c.name}</button>`
  ).join('');
}

function selectCategory(catId) {
  currentCategory = catId;
  renderCategories();
  filterProducts();
}

// ==================== PRODUCTS ====================
function filterProducts() {
  searchQuery = document.getElementById('searchInput').value.toLowerCase().trim();
  renderProducts();
}

function renderProducts() {
  const grid = document.getElementById('productsGrid');
  let filtered = products;
  if (currentCategory !== 'all') filtered = filtered.filter(p => p.category === currentCategory);
  if (searchQuery) filtered = filtered.filter(p => p.name.toLowerCase().includes(searchQuery) || p.sku.toLowerCase().includes(searchQuery));

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--tx3);">
      <div style="font-size:48px;margin-bottom:12px;">🔍</div><div>Товары не найдены</div></div>`;
    return;
  }

  grid.innerHTML = filtered.map(p => `
    <div class="product-card" onclick="addToCart(${p.id})">
      <div class="product-icon">${p.icon}</div>
      <div class="product-name">${highlightSearch(p.name)}</div>
      <div class="product-sku">${p.sku}</div>
      <div class="product-price">${formatPrice(p.price)}</div>
      <div class="product-stock ${p.stock <= 5 ? 'low' : ''}">${p.stock <= 5 ? '⚠️' : '📦'} Остаток: ${p.stock} шт.</div>
    </div>
  `).join('');
}

function highlightSearch(text) {
  if (!searchQuery) return text;
  const regex = new RegExp(`(${escapeRegex(searchQuery)})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

function escapeRegex(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// ==================== CART ====================
function addToCart(productId) {
  if (!shiftActive) { notify('Сначала откройте смену!', 'error'); return; }
  const product = products.find(p => p.id === productId);
  if (!product) return;
  const existing = cart.find(item => item.id === productId);
  if (existing) {
    if (existing.qty >= product.stock) { notify('Недостаточно товара!', 'error'); return; }
    existing.qty++;
  } else {
    if (product.stock <= 0) { notify('Товар отсутствует!', 'error'); return; }
    cart.push({ ...product, qty: 1 });
  }
  updateCart();
  notify(`${product.name} добавлен`, 'success');
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  updateCart();
}

function changeQty(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  const product = products.find(p => p.id === productId);
  const newQty = item.qty + delta;
  if (newQty <= 0) { removeFromCart(productId); return; }
  if (newQty > product.stock) { notify('Недостаточно товара!', 'error'); return; }
  item.qty = newQty;
  updateCart();
}

function clearCart() {
  if (cart.length === 0) return;
  cart = [];
  discountPercent = 0;
  document.getElementById('discountInput').value = '';
  updateCart();
}

function updateCart() {
  const container = document.getElementById('cartItems');
  const countEl = document.getElementById('cartCount');
  const totalItemsEl = document.getElementById('totalItems');
  const subtotalEl = document.getElementById('subtotal');
  const grandTotalEl = document.getElementById('grandTotal');
  const discountRowEl = document.getElementById('discountRow');
  const discountAmountEl = document.getElementById('discountAmount');
  const payBtn = document.getElementById('payBtn');

  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  discountPercent = Math.min(100, Math.max(0, parseInt(document.getElementById('discountInput').value) || 0));
  const discountValue = Math.round(subtotal * discountPercent / 100);
  const grandTotal = subtotal - discountValue;

  countEl.textContent = cart.length;
  countEl.classList.add('pop');
  setTimeout(() => countEl.classList.remove('pop'), 200);
  totalItemsEl.textContent = `${totalItems} шт.`;
  subtotalEl.textContent = formatPrice(subtotal);
  grandTotalEl.textContent = formatPrice(grandTotal);

  if (discountPercent > 0) {
    discountRowEl.style.display = 'flex';
    discountAmountEl.textContent = `-${formatPrice(discountValue)}`;
  } else {
    discountRowEl.style.display = 'none';
  }
  payBtn.disabled = cart.length === 0;

  if (cart.length === 0) {
    container.innerHTML = `<div class="cart-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>Корзина пуста</div>`;
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-icon">${item.icon}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${formatPrice(item.price)} × ${item.qty}</div>
      </div>
      <div class="cart-item-qty">
        <button class="qty-btn" onclick="changeQty(${item.id}, -1)">−</button>
        <span class="qty-value">${item.qty}</span>
        <button class="qty-btn" onclick="changeQty(${item.id}, 1)">+</button>
      </div>
      <div class="cart-item-total">${formatPrice(item.price * item.qty)}</div>
      <button class="cart-item-remove" onclick="removeFromCart(${item.id})">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `).join('');
}

function applyDiscount() {
  updateCart();
  if (discountPercent > 0) notify(`Скидка ${discountPercent}% применена`, 'info');
}

function getGrandTotal() {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  return subtotal - Math.round(subtotal * discountPercent / 100);
}

// ==================== PAYMENT ====================
function openPaymentModal() {
  if (cart.length === 0 || !shiftActive) return;
  const total = getGrandTotal();
  document.getElementById('paymentAmount').textContent = formatPrice(total);
  document.getElementById('cashReceived').value = '';
  document.getElementById('changeAmount').textContent = '0 ₽';
  selectPaymentMethod('cash');
  updateQuickCash(total);
  openModal('paymentModal');
}

function selectPaymentMethod(method) {
  selectedPaymentMethod = method;
  document.getElementById('methodCash').classList.toggle('active', method === 'cash');
  document.getElementById('methodCard').classList.toggle('active', method === 'card');
  document.getElementById('cashSection').classList.toggle('show', method === 'cash');
}

function updateQuickCash(total) {
  const container = document.getElementById('quickCash');
  const suggestions = [];
  const rounded = Math.ceil(total / 1000) * 1000;
  suggestions.push(rounded, rounded + 1000, rounded + 2000, 5000, 10000, 50000);
  const unique = [...new Set(suggestions)].filter(v => v >= total).sort((a, b) => a - b).slice(0, 4);
  container.innerHTML = unique.map(v => `<button class="quick-cash-btn" onclick="setCashAmount(${v})">${formatPrice(v)}</button>`).join('');
}

function setCashAmount(amount) {
  document.getElementById('cashReceived').value = amount;
  calculateChange();
}

function calculateChange() {
  const total = getGrandTotal();
  const received = parseInt(document.getElementById('cashReceived').value) || 0;
  const change = Math.max(0, received - total);
  document.getElementById('changeAmount').textContent = formatPrice(change);
}

function renderNumpad() {
  const keys = ['1','2','3','4','5','6','7','8','9','⌫','0','✓'];
  document.getElementById('numpad').innerHTML = keys.map(key => {
    if (key === '⌫') return `<button class="numpad-btn" onclick="numpadBackspace()">⌫</button>`;
    if (key === '✓') return `<button class="numpad-btn" onclick="processPayment()">✓</button>`;
    return `<button class="numpad-btn" onclick="numpadInput('${key}')">${key}</button>`;
  }).join('');
}

function numpadInput(digit) {
  const input = document.getElementById('cashReceived');
  input.value = input.value + digit;
  calculateChange();
}

function numpadBackspace() {
  const input = document.getElementById('cashReceived');
  input.value = input.value.slice(0, -1);
  calculateChange();
}

function processPayment() {
  const total = getGrandTotal();
  if (selectedPaymentMethod === 'cash') {
    const received = parseInt(document.getElementById('cashReceived').value) || 0;
    if (received < total) { notify('Недостаточно средств!', 'error'); return; }
  }

  receiptNum++;
  const sale = {
    id: receiptNum,
    items: cart.map(item => ({ ...item })),
    subtotal: cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    discountPercent: discountPercent,
    discountValue: Math.round(cart.reduce((sum, item) => sum + item.price * item.qty, 0) * discountPercent / 100),
    total: total,
    method: selectedPaymentMethod,
    cashReceived: selectedPaymentMethod === 'cash' ? parseInt(document.getElementById('cashReceived').value) : total,
    change: selectedPaymentMethod === 'cash' ? Math.max(0, parseInt(document.getElementById('cashReceived').value) - total) : 0,
    time: new Date().toLocaleTimeString('ru-RU'),
    date: new Date().toLocaleDateString('ru-RU'),
    dateISO: new Date().toISOString().split('T')[0],
    timestamp: Date.now(),
    refunded: false,
    refundAmount: 0,
    refundedItems: [],
  };

  allSales.push(sale);
  cart.forEach(item => {
    const product = products.find(p => p.id === item.id);
    if (product) product.stock -= item.qty;
  });

  closeModal('paymentModal');
  showReceipt(sale, false);
  cart = [];
  discountPercent = 0;
  document.getElementById('discountInput').value = '';
  updateCart();
  renderProducts();
  updateShiftInfo();
  notify(`Оплата прошла! Чек #${String(sale.id).padStart(4, '0')}`, 'success');
}

// ==================== RECEIPT ====================
function showReceipt(sale, isRefundReceipt) {
  const content = document.getElementById('receiptContent');
  const title = isRefundReceipt ? 'Чек возврата' : 'Кассовый чек';
  content.innerHTML = `
    <div class="receipt-header">
      <h3>📱 МобайлШоп</h3>
      <div>${title}</div>
      <div style="font-size:10px;color:#666;margin-top:3px;">${sale.date} ${sale.time} | Чек #${String(sale.id).padStart(4, '0')}</div>
      <div style="font-size:10px;color:#666;">Кассир: Иванов А.</div>
    </div>
    <div class="receipt-divider"></div>
    <div class="receipt-items"><table>
      ${sale.items.map(item => `<tr><td class="item-name">${item.name}</td><td class="item-qty">${item.qty}</td><td class="item-total">${formatPrice(item.price * item.qty)}</td></tr>`).join('')}
    </table></div>
    <div class="receipt-divider"></div>
    <div class="receipt-totals">
      <div class="row"><span>Подитог:</span><span>${formatPrice(sale.subtotal)}</span></div>
      ${sale.discountPercent > 0 ? `<div class="row" style="color:#B02020;"><span>Скидка ${sale.discountPercent}%:</span><span>-${formatPrice(sale.discountValue)}</span></div>` : ''}
      <div class="row grand"><span>ИТОГО:</span><span>${formatPrice(sale.total)}</span></div>
      ${!isRefundReceipt ? `<div class="row"><span>Оплата (${sale.method === 'cash' ? 'нал.' : 'карта'}):</span><span>${formatPrice(sale.cashReceived)}</span></div>` : ''}
      ${sale.change > 0 ? `<div class="row"><span>Сдача:</span><span>${formatPrice(sale.change)}</span></div>` : ''}
    </div>
    <div class="receipt-divider"></div>
    <div class="receipt-footer"><div>Спасибо за покупку!</div><div style="margin-top:3px;">www.mobileshop.ru</div></div>
  `;
  openModal('receiptModal');
}

function printReceipt() {
  const content = document.getElementById('receiptContent').innerHTML;
  const win = window.open('', '_blank', 'width=320,height=600');
  win.document.write(`<html><head><title>Чек</title><style>body{font-family:'Courier New',monospace;font-size:11px;padding:10px;max-width:300px;margin:0 auto;}.receipt-header{text-align:center;margin-bottom:10px;}.receipt-header h3{font-size:14px;margin-bottom:3px;}.receipt-divider{border-top:1px dashed #999;margin:6px 0;}.receipt-items table{width:100%;border-collapse:collapse;}.receipt-items td{padding:2px 0;vertical-align:top;}.item-name{max-width:150px;}.item-qty{text-align:center;width:28px;}.item-total{text-align:right;width:65px;}.receipt-totals .row{display:flex;justify-content:space-between;padding:2px 0;}.receipt-totals .grand{font-weight:700;font-size:13px;border-top:1px dashed #999;padding-top:5px;margin-top:3px;}.receipt-footer{text-align:center;margin-top:10px;color:#888;}</style></head><body>${content}</body></html>`);
  win.document.close();
  win.print();
  win.close();
}

// ==================== SHIFT ====================
function openShiftModal() {
  updateShiftInfo();
  openModal('shiftModal');
}

function openShift() {
  if (shiftActive) { notify('Смена уже открыта!', 'error'); return; }
  const openingCash = parseInt(document.getElementById('openingCash').value) || 0;
  shiftActive = true;
  shiftInfo = {
    openTime: new Date().toLocaleTimeString('ru-RU'),
    openDate: new Date().toLocaleDateString('ru-RU'),
    openingCash: openingCash,
  };
  document.getElementById('shiftDot').classList.add('active');
  document.getElementById('shiftStatusText').textContent = 'Смена открыта';
  document.getElementById('openShiftBtn').disabled = true;
  document.getElementById('closeShiftBtn').disabled = false;
  updateShiftInfo();
  closeModal('shiftModal');
  notify(`Смена открыта. Начальная сумма: ${formatPrice(openingCash)}`, 'success');
}

function closeShift() {
  if (!shiftActive) return;
  const shiftSales = allSales.filter(s => !s.refunded);
  const cashRev = shiftSales.filter(s => s.method === 'cash').reduce((sum, s) => sum + s.total, 0);
  const cardRev = shiftSales.filter(s => s.method === 'card').reduce((sum, s) => sum + s.total, 0);
  const totalRev = cashRev + cardRev;
  const refundTotal = allRefunds.reduce((sum, r) => sum + r.refundTotal, 0);
  const expectedCash = shiftInfo.openingCash + cashRev - (allRefunds.filter(r => r.originalMethod === 'cash').reduce((sum, r) => sum + r.refundTotal, 0));

  if (!confirm(`Закрыть смену?\n\nПродаж: ${shiftSales.length}\nВыручка: ${formatPrice(totalRev)}\nВозвраты: ${formatPrice(refundTotal)}\nОжидается в кассе: ${formatPrice(expectedCash)}`)) return;

  shiftActive = false;
  document.getElementById('shiftDot').classList.remove('active');
  document.getElementById('shiftStatusText').textContent = 'Смена закрыта';
  document.getElementById('openShiftBtn').disabled = false;
  document.getElementById('closeShiftBtn').disabled = true;
  closeModal('shiftModal');
  notify(`Смена закрыта. Выручка: ${formatPrice(totalRev - refundTotal)}`, 'info');
}

function updateShiftInfo() {
  if (!shiftInfo) return;
  const shiftSales = allSales.filter(s => !s.refunded);
  const cashRev = shiftSales.filter(s => s.method === 'cash').reduce((sum, s) => sum + s.total, 0);
  const cardRev = shiftSales.filter(s => s.method === 'card').reduce((sum, s) => sum + s.total, 0);
  const refundTotal = allRefunds.reduce((sum, r) => sum + r.refundTotal, 0);
  const cashRefunds = allRefunds.filter(r => r.originalMethod === 'cash').reduce((sum, r) => sum + r.refundTotal, 0);

  document.getElementById('infoStatus').textContent = shiftActive ? '✅ Открыта' : '❌ Закрыта';
  document.getElementById('infoStatus').style.color = shiftActive ? 'var(--gn)' : 'var(--rd)';
  document.getElementById('infoOpenTime').textContent = `${shiftInfo.openDate} ${shiftInfo.openTime}`;
  document.getElementById('infoOpeningCash').textContent = formatPrice(shiftInfo.openingCash);
  document.getElementById('infoSalesCount').textContent = shiftSales.length;
  document.getElementById('infoCashRevenue').textContent = formatPrice(cashRev);
  document.getElementById('infoCardRevenue').textContent = formatPrice(cardRev);
  document.getElementById('infoTotalRevenue').textContent = formatPrice(cashRev + cardRev);
  document.getElementById('infoRefunds').textContent = formatPrice(refundTotal);
  document.getElementById('infoExpectedCash').textContent = formatPrice(shiftInfo.openingCash + cashRev - cashRefunds);

  const list = document.getElementById('shiftSalesList');
  if (allSales.length === 0) {
    list.innerHTML = `<div class="cart-empty" style="height:200px;"><span style="color:var(--tx3)">Нет продаж за смену</span></div>`;
  } else {
    list.innerHTML = [...allSales].reverse().map(sale => `
      <div class="sale-item">
        <div class="sale-info">
          <span>Чек #${String(sale.id).padStart(4, '0')} — ${sale.items.length} тов.</span>
          <span class="sale-time">${sale.time} | ${sale.method === 'cash' ? '💵 Наличные' : '💳 Карта'}</span>
        </div>
        <span class="sale-amount ${sale.refunded ? 'refunded' : ''}">${sale.refunded ? 'ВОЗВРАТ' : formatPrice(sale.total)}</span>
      </div>
    `).join('');
  }
}

// ==================== TABS ====================
function switchTab(tabId, modalId) {
  const modal = document.getElementById(modalId);
  const tabBtns = modal.querySelectorAll('.tab-btn');
  const tabContents = modal.querySelectorAll('.tab-content');
  tabBtns.forEach((btn, idx) => {
    btn.classList.toggle('active', tabContents[idx].id === tabId);
  });
  tabContents.forEach(el => el.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
}

// ==================== SALES JOURNAL ====================
function openJournalModal() {
  renderJournal();
  openModal('journalModal');
}

function resetJournalFilters() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('journalDateFrom').value = today;
  document.getElementById('journalDateTo').value = today;
  document.getElementById('journalSearch').value = '';
  renderJournal();
}

function renderJournal() {
  const dateFrom = document.getElementById('journalDateFrom').value;
  const dateTo = document.getElementById('journalDateTo').value;
  const search = document.getElementById('journalSearch').value.toLowerCase().trim();

  let filtered = [...allSales];
  if (dateFrom) filtered = filtered.filter(s => s.dateISO >= dateFrom);
  if (dateTo) filtered = filtered.filter(s => s.dateISO <= dateTo);
  if (search) filtered = filtered.filter(s =>
    String(s.id).includes(search) ||
    s.items.some(item => item.name.toLowerCase().includes(search) || item.sku.toLowerCase().includes(search))
  );

  const totalSales = filtered.filter(s => !s.refunded).reduce((sum, s) => sum + s.total, 0);
  const totalRefunds = allRefunds.reduce((sum, r) => sum + r.refundTotal, 0);
  const cashTotal = filtered.filter(s => !s.refunded && s.method === 'cash').reduce((sum, s) => sum + s.total, 0);
  const cardTotal = filtered.filter(s => !s.refunded && s.method === 'card').reduce((sum, s) => sum + s.total, 0);

  document.getElementById('journalStats').innerHTML = `
    <div class="stat-card green"><label>Выручка</label><span class="stat-value">${formatPrice(totalSales)}</span></div>
    <div class="stat-card red"><label>Возвраты</label><span class="stat-value">${formatPrice(totalRefunds)}</span></div>
    <div class="stat-card amber"><label>Наличные</label><span class="stat-value">${formatPrice(cashTotal)}</span></div>
    <div class="stat-card blue"><label>Карта</label><span class="stat-value">${formatPrice(cardTotal)}</span></div>
  `;

  const body = document.getElementById('journalBody');
  if (filtered.length === 0) {
    body.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--tx3);">Нет записей</td></tr>`;
    return;
  }

  body.innerHTML = [...filtered].reverse().map(sale => `
    <tr>
      <td class="mono">#${String(sale.id).padStart(4, '0')}</td>
      <td>${sale.date}<br><span style="color:var(--tx3);font-size:11px;">${sale.time}</span></td>
      <td>${sale.items.length} тов.</td>
      <td><span class="badge ${sale.method === 'cash' ? 'badge-cash' : 'badge-card'}">${sale.method === 'cash' ? '💵 Нал.' : '💳 Карта'}</span></td>
      <td class="mono ${sale.refunded ? 'refund-amount' : 'amount'}">${sale.refunded ? '↩ ' : ''}${formatPrice(sale.total)}</td>
      <td><span class="badge ${sale.refunded ? 'badge-refund' : 'badge-sale'}">${sale.refunded ? 'Возврат' : 'Продажа'}</span></td>
      <td style="white-space:nowrap;">
        <button class="btn btn-secondary btn-sm" onclick="viewSaleDetail(${sale.id})" style="margin-right:4px;">👁</button>
        ${!sale.refunded ? `<button class="btn btn-danger btn-sm" onclick="openRefundModal(${sale.id})">↩</button>` : ''}
      </td>
    </tr>
  `).join('');
}

function viewSaleDetail(saleId) {
  const sale = allSales.find(s => s.id === saleId);
  if (!sale) return;

  document.getElementById('saleDetailTitle').textContent = `Чек #${String(sale.id).padStart(4, '0')}`;
  document.getElementById('saleDetailBody').innerHTML = `
    <div class="refund-sale-info">
      <div class="rsi-row"><label>Дата:</label><span>${sale.date} ${sale.time}</span></div>
      <div class="rsi-row"><label>Оплата:</label><span>${sale.method === 'cash' ? '💵 Наличные' : '💳 Карта'}</span></div>
      <div class="rsi-row"><label>Подитог:</label><span>${formatPrice(sale.subtotal)}</span></div>
      ${sale.discountPercent > 0 ? `<div class="rsi-row"><label>Скидка ${sale.discountPercent}%:</label><span style="color:var(--rd)">-${formatPrice(sale.discountValue)}</span></div>` : ''}
      <div class="rsi-row"><label>Итого:</label><span style="color:var(--gn);font-size:16px;">${formatPrice(sale.total)}</span></div>
      ${sale.change > 0 ? `<div class="rsi-row"><label>Сдача:</label><span>${formatPrice(sale.change)}</span></div>` : ''}
      ${sale.refunded ? `<div class="rsi-row"><label>Статус:</label><span style="color:var(--rd);">↩ Возврат</span></div>` : ''}
    </div>
    <div class="sale-detail-items">
      ${sale.items.map(item => `
        <div class="sale-detail-item">
          <span class="sdi-name">${item.icon} ${item.name}</span>
          <span class="sdi-qty">×${item.qty}</span>
          <span class="sdi-total">${formatPrice(item.price * item.qty)}</span>
        </div>
      `).join('')}
    </div>
    <div class="receipt-actions">
      <button class="btn btn-secondary" onclick="closeModal('saleDetailModal')">Закрыть</button>
      <button class="btn btn-primary" onclick="closeModal('saleDetailModal');showReceipt(allSales.find(s=>s.id===${sale.id}),false)">🧾 Чек</button>
      ${!sale.refunded ? `<button class="btn btn-danger" onclick="closeModal('saleDetailModal');openRefundModal(${sale.id})">↩ Возврат</button>` : ''}
    </div>
  `;
  openModal('saleDetailModal');
}

// ==================== REFUND ====================
function openRefundModal(saleId) {
  const sale = allSales.find(s => s.id === saleId);
  if (!sale || sale.refunded) { notify('Возврат невозможен', 'error'); return; }

  currentRefundSaleId = saleId;
  refundQuantities = {};
  sale.items.forEach(item => { refundQuantities[item.id] = item.qty; });

  renderRefundModal();
  openModal('refundModal');
}

function renderRefundModal() {
  const sale = allSales.find(s => s.id === currentRefundSaleId);
  if (!sale) return;

  const refundTotal = sale.items.reduce((sum, item) => {
    const qty = refundQuantities[item.id] || 0;
    return sum + item.price * qty;
  }, 0);

  const body = document.getElementById('refundBody');
  body.innerHTML = `
    <div class="refund-sale-info">
      <div class="rsi-row"><label>Чек:</label><span>#${String(sale.id).padStart(4, '0')}</span></div>
      <div class="rsi-row"><label>Дата:</label><span>${sale.date} ${sale.time}</span></div>
      <div class="rsi-row"><label>Оплата:</label><span>${sale.method === 'cash' ? '💵 Наличные' : '💳 Карта'}</span></div>
      <div class="rsi-row"><label>Сумма продажи:</label><span>${formatPrice(sale.total)}</span></div>
    </div>
    <div style="font-size:13px;font-weight:600;margin-bottom:8px;">Выберите товары для возврата:</div>
    <div class="refund-items-list">
      ${sale.items.map(item => `
        <div class="refund-item-row">
          <span class="fri-name">${item.icon} ${item.name}</span>
          <span class="fri-price">${formatPrice(item.price)}</span>
          <div class="refund-qty-ctrl">
            <button class="rq-btn" onclick="changeRefundQty(${item.id}, -1)">−</button>
            <span class="rq-val">${refundQuantities[item.id]}</span>
            <button class="rq-btn" onclick="changeRefundQty(${item.id}, 1)">+</button>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="refund-total-bar">
      <label>Сумма возврата:</label>
      <span class="rt-amount">${formatPrice(refundTotal)}</span>
    </div>
    <div style="font-size:12px;color:var(--tx3);margin-bottom:6px;">Причина возврата:</div>
    <textarea class="refund-reason" id="refundReason" placeholder="Укажите причину возврата..."></textarea>
    <div class="receipt-actions">
      <button class="btn btn-secondary" onclick="closeModal('refundModal')">Отмена</button>
      <button class="btn btn-danger" onclick="processRefund()" ${refundTotal === 0 ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}>↩ Оформить возврат</button>
    </div>
  `;
}

function changeRefundQty(itemId, delta) {
  const sale = allSales.find(s => s.id === currentRefundSaleId);
  if (!sale) return;
  const item = sale.items.find(i => i.id === itemId);
  if (!item) return;
  const current = refundQuantities[itemId] || 0;
  const newQty = Math.max(0, Math.min(item.qty, current + delta));
  refundQuantities[itemId] = newQty;
  renderRefundModal();
}

function processRefund() {
  const sale = allSales.find(s => s.id === currentRefundSaleId);
  if (!sale) return;

  const refundItems = sale.items.filter(item => (refundQuantities[item.id] || 0) > 0);
  if (refundItems.length === 0) { notify('Выберите товары для возврата', 'error'); return; }

  const reason = document.getElementById('refundReason').value.trim();
  if (!reason) { notify('Укажите причину возврата', 'warning'); return; }

  const refundTotal = refundItems.reduce((sum, item) => sum + item.price * refundQuantities[item.id], 0);

  const allReturned = sale.items.every(item => (refundQuantities[item.id] || 0) === item.qty);

  refundItems.forEach(item => {
    const product = products.find(p => p.id === item.id);
    if (product) product.stock += refundQuantities[item.id];
  });

  const refund = {
    id: allRefunds.length + 1,
    saleId: sale.id,
    items: refundItems.map(item => ({ ...item, qty: refundQuantities[item.id] })),
    refundTotal: refundTotal,
    reason: reason,
    originalMethod: sale.method,
    time: new Date().toLocaleTimeString('ru-RU'),
    date: new Date().toLocaleDateString('ru-RU'),
    dateISO: new Date().toISOString().split('T')[0],
    timestamp: Date.now(),
  };

  allRefunds.push(refund);

  if (allReturned) {
    sale.refunded = true;
    sale.refundAmount = refundTotal;
    sale.refundedItems = refundItems.map(i => i.id);
  } else {
    sale.refundAmount = (sale.refundAmount || 0) + refundTotal;
    refundItems.forEach(item => {
      const saleItem = sale.items.find(si => si.id === item.id);
      if (saleItem) saleItem.qty -= refundQuantities[item.id];
    });
    sale.items = sale.items.filter(item => item.qty > 0);
    sale.total -= refundTotal;
    sale.subtotal -= refundTotal;
  }

  closeModal('refundModal');
  renderProducts();
  updateShiftInfo();

  const refundReceiptSale = {
    id: sale.id,
    items: refund.items,
    subtotal: refundTotal,
    discountPercent: 0,
    discountValue: 0,
    total: refundTotal,
    method: sale.method,
    cashReceived: 0,
    change: 0,
    time: refund.time,
    date: refund.date,
  };
  showReceipt(refundReceiptSale, true);

  notify(`Возврат оформлен: ${formatPrice(refundTotal)}`, 'warning');
}

// ==================== MODALS ====================
function openModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('show');
  });
});

// ==================== NOTIFICATIONS ====================
function notify(message, type = 'info') {
  const el = document.getElementById('notification');
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  el.className = `notification ${type}`;
  el.innerHTML = `${icons[type] || ''} ${message}`;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}

// ==================== UTILS ====================
function formatPrice(price) {
  return price.toLocaleString('ru-RU') + ' ₽';
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.show').forEach(m => m.classList.remove('show'));
  }
});

init();
</script>
</body>
</html>

