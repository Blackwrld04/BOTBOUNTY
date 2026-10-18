#!/usr/bin/env python3
"""
BotBounty Project Requirements Document (PRD / SRS) PDF Generator v2.2
Compiles institutional, publication-grade Software Requirements Specification PDF via WeasyPrint
and writes docs/PROJECT_REQUIREMENTS.md.
"""

import os
import shutil
import weasyprint

def generate_html_content():
    return """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>BotBounty — Software Requirements Specification & Project Requirements Document (SRS/PRD)</title>
<style>
  @page {
    size: A4;
    margin: 18mm 16mm 18mm 16mm;
    @top-left {
      content: "BotBounty Protocol • Software Requirements Specification (SRS/PRD)";
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 7.5pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    @top-right {
      content: "BOT Chain (Mainnet 677 / Bohr 968) • v2.1";
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 7.5pt;
      color: #64748b;
      font-weight: 600;
    }
    @bottom-left {
      content: "BotBounty Protocol • Non-Custodial Multi-Asset Bounty Escrow • MIT Open-Source";
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 7.2pt;
      color: #94a3b8;
    }
    @bottom-right {
      content: "Page " counter(page) " of " counter(pages);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 7.5pt;
      font-weight: 700;
      color: #475569;
    }
  }

  @page:first {
    margin: 14mm 16mm 14mm 16mm;
    @top-left { content: normal; }
    @top-right { content: normal; }
    @bottom-left { content: normal; }
    @bottom-right { content: normal; }
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    line-height: 1.48;
    font-size: 8.7pt;
    text-align: justify;
    margin: 0;
    padding: 0;
  }

  /* Typography */
  h1 {
    font-size: 14pt;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.025em;
    margin-top: 15pt;
    margin-bottom: 5pt;
    border-bottom: 2px solid #0284c7;
    padding-bottom: 3pt;
    page-break-after: avoid;
  }

  h2 {
    font-size: 10.8pt;
    font-weight: 700;
    color: #0369a1;
    margin-top: 11pt;
    margin-bottom: 4pt;
    page-break-after: avoid;
  }

  h3 {
    font-size: 9.3pt;
    font-weight: 700;
    color: #1e293b;
    margin-top: 8pt;
    margin-bottom: 3pt;
    page-break-after: avoid;
  }

  p {
    margin-top: 0;
    margin-bottom: 5pt;
  }

  ul, ol {
    margin-top: 0;
    margin-bottom: 5pt;
    padding-left: 16px;
  }

  li {
    margin-bottom: 2.2pt;
  }

  strong {
    font-weight: 700;
    color: #0f172a;
  }

  code {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 7.7pt;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    padding: 1px 3.5px;
    border-radius: 3px;
    color: #0369a1;
  }

  pre {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 7.4pt;
    background: #0f172a;
    color: #e2e8f0;
    padding: 7px 10px;
    border-radius: 5px;
    overflow-x: auto;
    margin: 5pt 0;
    line-height: 1.36;
    page-break-inside: avoid;
  }

  /* Cover Page */
  .cover-container {
    page-break-after: always;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 97%;
    padding-top: 2mm;
  }

  .cover-badges {
    margin-bottom: 4mm;
  }

  .badge {
    display: inline-block;
    padding: 2.5px 7px;
    font-size: 7pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    border-radius: 4px;
    margin-right: 4px;
    margin-bottom: 3px;
  }

  .badge-primary { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
  .badge-emerald { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
  .badge-indigo  { background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe; }
  .badge-amber   { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
  .badge-rose    { background: #ffe4e6; color: #be123c; border: 1px solid #fecdd3; }
  .badge-slate   { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }

  .cover-title {
    font-size: 23pt;
    font-weight: 800;
    line-height: 1.15;
    color: #0f172a;
    letter-spacing: -0.03em;
    margin: 0 0 3mm 0;
    text-align: left;
  }

  .cover-subtitle {
    font-size: 10pt;
    font-weight: 400;
    line-height: 1.4;
    color: #475569;
    margin: 0 0 5mm 0;
    text-align: left;
  }

  .cover-meta-grid {
    display: table;
    width: 100%;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 7px 11px;
    box-sizing: border-box;
    margin-bottom: 5mm;
  }

  .cover-meta-row {
    display: table-row;
  }

  .cover-meta-cell {
    display: table-cell;
    padding: 3px 5px;
    font-size: 7.9pt;
    vertical-align: top;
  }

  .meta-label {
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    font-size: 6.5pt;
    letter-spacing: 0.05em;
    display: block;
    margin-bottom: 1px;
  }

  .meta-value {
    color: #0f172a;
    font-weight: 600;
  }

  .abstract-box {
    background: #ffffff;
    border-left: 4px solid #0284c7;
    border-top: 1px solid #e2e8f0;
    border-right: 1px solid #e2e8f0;
    border-bottom: 1px solid #e2e8f0;
    border-radius: 0 6px 6px 0;
    padding: 9px 13px;
    margin-bottom: 4mm;
  }

  .abstract-title {
    font-size: 8.8pt;
    font-weight: 800;
    color: #0369a1;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 3px;
  }

  .abstract-text {
    font-size: 8.2pt;
    line-height: 1.46;
    color: #334155;
    margin: 0;
  }

  .cover-footer {
    border-top: 1px solid #e2e8f0;
    padding-top: 5px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 7.3pt;
    color: #64748b;
  }

  /* Table of Contents */
  .toc-container {
    page-break-after: always;
    padding-top: 3mm;
  }

  .toc-title {
    font-size: 14pt;
    font-weight: 800;
    color: #0f172a;
    border-bottom: 2px solid #0284c7;
    padding-bottom: 3.5pt;
    margin-bottom: 10pt;
  }

  .toc-grid {
    display: table;
    width: 100%;
    border-collapse: collapse;
  }

  .toc-row {
    display: table-row;
    border-bottom: 1px dotted #cbd5e1;
  }

  .toc-row:last-child {
    border-bottom: none;
  }

  .toc-section-num {
    display: table-cell;
    width: 7%;
    font-weight: 700;
    color: #0369a1;
    padding: 4pt 0;
    font-size: 8.3pt;
    vertical-align: middle;
  }

  .toc-section-title {
    display: table-cell;
    width: 78%;
    font-weight: 600;
    padding: 4pt 0;
    font-size: 8.3pt;
    vertical-align: middle;
  }

  .toc-section-title a {
    color: #1e293b;
    text-decoration: none;
  }

  .toc-section-page {
    display: table-cell;
    width: 15%;
    text-align: right;
    font-weight: 700;
    padding: 4pt 0;
    font-size: 8.1pt;
    vertical-align: middle;
  }

  .toc-section-page a {
    color: #64748b;
    text-decoration: none;
  }

  .toc-page-link::after {
    content: "Page " target-counter(attr(href), page);
  }

  /* Callout Boxes */
  .callout {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-left: 4px solid #0284c7;
    border-radius: 4px;
    padding: 6.5px 10.5px;
    margin: 6.5pt 0;
    page-break-inside: avoid;
  }

  .callout-title {
    font-weight: 700;
    font-size: 7.8pt;
    color: #0369a1;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 2px;
  }

  .callout-emerald {
    border-left-color: #10b981;
    background: #f0fdf4;
  }
  .callout-emerald .callout-title { color: #047857; }

  .callout-amber {
    border-left-color: #f59e0b;
    background: #fffbeb;
  }
  .callout-amber .callout-title { color: #b45309; }

  .callout-rose {
    border-left-color: #f43f5e;
    background: #fff1f2;
  }
  .callout-rose .callout-title { color: #be123c; }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 6.5pt 0;
    font-size: 7.8pt;
    page-break-inside: avoid;
  }

  th {
    background: #f1f5f9;
    color: #0f172a;
    font-weight: 700;
    text-align: left;
    padding: 4.5px 6.5px;
    border: 1px solid #cbd5e1;
    font-size: 7.4pt;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  td {
    padding: 3.8px 6.5px;
    border: 1px solid #e2e8f0;
    vertical-align: top;
    line-height: 1.36;
  }

  tr:nth-child(even) td {
    background: #f8fafc;
  }

  /* Requirement Box */
  .req-box {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 5px;
    margin: 7.5pt 0;
    page-break-inside: avoid;
    box-shadow: 0 1px 2px rgba(0,0,0,0.02);
  }

  .req-header {
    background: #f8fafc;
    border-bottom: 1px solid #cbd5e1;
    padding: 5px 9px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .req-id {
    font-weight: 800;
    color: #0369a1;
    font-size: 8.5pt;
    letter-spacing: -0.01em;
  }

  .req-title {
    font-weight: 700;
    color: #0f172a;
    font-size: 8.5pt;
    margin-left: 6px;
  }

  .req-table {
    width: 100%;
    border-collapse: collapse;
    margin: 0;
  }

  .req-table td {
    border: none;
    padding: 2.2px 8px;
    vertical-align: top;
  }

  .req-label-cell {
    width: 135px;
    font-weight: 700;
    color: #475569;
    font-size: 7.1pt;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    background: transparent !important;
  }

  .req-val-cell {
    color: #1e293b;
    font-size: 8pt;
    background: transparent !important;
  }

  .req-criteria {
    background: #f8fafc;
    border-top: 1px dashed #cbd5e1;
    padding: 5px 9px;
    font-size: 7.7pt;
  }

  .req-criteria ul {
    margin: 2pt 0;
    padding-left: 14px;
  }

  .page-break {
    page-break-before: always;
  }

  /* Flow Steps */
  .flow-step-container {
    display: table;
    width: 100%;
    margin: 6pt 0;
    border-collapse: separate;
    border-spacing: 4px;
  }

  .flow-step {
    display: table-cell;
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-top: 3px solid #0284c7;
    border-radius: 4px;
    padding: 5px 7px;
    width: 20%;
    vertical-align: top;
    font-size: 7.4pt;
  }

  .flow-step-num {
    font-weight: 800;
    color: #0369a1;
    font-size: 8.1pt;
    margin-bottom: 2px;
  }

  .flow-step-title {
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 2px;
  }

  .flow-step-desc {
    color: #475569;
    line-height: 1.32;
  }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover-container">
  <div>
    <div class="cover-badges">
      <span class="badge badge-primary">BOT Chain Native</span>
      <span class="badge badge-emerald">EVM 677 / Bohr 968</span>
      <span class="badge badge-indigo">Escrow: 0xB128...164A</span>
      <span class="badge badge-amber">USDT & Native $BOT</span>
      <span class="badge badge-slate">Specification v2.1</span>
    </div>

    <div class="cover-title">
      BotBounty Protocol: Software Requirements Specification & Project Requirements Document
    </div>

    <div class="cover-subtitle">
      Comprehensive Engineering Specifications, Functional Requirements, Smart Contract Invariants, and Non-Custodial Multi-Asset Escrow Architecture for Autonomous AI Agents and Web3 Developers on BOT Chain.
    </div>

    <div class="cover-meta-grid">
      <div class="cover-meta-row">
        <div class="cover-meta-cell" style="width: 25%;">
          <span class="meta-label">Document ID</span>
          <span class="meta-value">PRD-BOTBOUNTY-2026-V2.1</span>
        </div>
        <div class="cover-meta-cell" style="width: 25%;">
          <span class="meta-label">Protocol Release</span>
          <span class="meta-value">v2.1 Production Baseline</span>
        </div>
        <div class="cover-meta-cell" style="width: 25%;">
          <span class="meta-label">Target Network</span>
          <span class="meta-value">BOT Chain (677 / 968)</span>
        </div>
        <div class="cover-meta-cell" style="width: 25%;">
          <span class="meta-label">Document Status</span>
          <span class="meta-value">Approved & Deployed</span>
        </div>
      </div>
      <div class="cover-meta-row">
        <div class="cover-meta-cell">
          <span class="meta-label">Primary Escrow Contract</span>
          <span class="meta-value"><code>0xB128F2f442554B6517D779788F28F2EB2612164A</code></span>
        </div>
        <div class="cover-meta-cell">
          <span class="meta-label">Settlement Currencies</span>
          <span class="meta-value">Native $BOT & Bridged USDT</span>
        </div>
        <div class="cover-meta-cell">
          <span class="meta-label">Test Automation</span>
          <span class="meta-value">Foundry 21/21 · Node 58/58</span>
        </div>
        <div class="cover-meta-cell">
          <span class="meta-label">Classification</span>
          <span class="meta-value">Institutional Open-Source (MIT)</span>
        </div>
      </div>
    </div>

    <div class="abstract-box">
      <div class="abstract-title">Executive Abstract</div>
      <div class="abstract-text">
        This document defines the formal engineering, architectural, and functional requirements for <strong>BotBounty</strong>, the premier decentralized, non-custodial bounty escrow and proof-of-work settlement protocol native to <strong>BOT Chain</strong> (Mainnet 677 / Bohr Testnet 968). BotBounty bridges Web3 protocol sponsors, autonomous AI agents, and independent human developers through deterministic smart contracts that eliminate intermediary rake fees (0% contributor fee), prevent maintainer ghosting via review timeout auto-claims, preserve pre-deadline intellectual property via blind submissions privacy, and protect against sybil manipulation with cryptographic authorization and single-submission constraints.
      </div>
    </div>

    <h3>Document Control & Revision History</h3>
    <table>
      <thead>
        <tr>
          <th style="width: 14%;">Version</th>
          <th style="width: 17%;">Release Date</th>
          <th style="width: 24%;">Primary Author</th>
          <th style="width: 45%;">Key Changes & Architectural Scope</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>v1.0.0</strong></td>
          <td>August 2026</td>
          <td>Core Protocol Team</td>
          <td>Initial conceptual release: Non-custodial escrow prototype, single-asset proof of work.</td>
        </tr>
        <tr>
          <td><strong>v2.0.0</strong></td>
          <td>October 2026</td>
          <td>Architecture Group</td>
          <td>Bohr Testnet deployment (968), multi-asset settlement ($BOT / USDT), EIP-712 auth, blind submissions.</td>
        </tr>
        <tr>
          <td><strong>v2.1.0</strong></td>
          <td>October 2026</td>
          <td>Security & Protocol Gov</td>
          <td>Anti-griefing authorization, review timeout auto-claims, dual-database failover (SQLite + Supabase), comprehensive 21 Foundry + 58 Backend verification suite.</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="cover-footer">
    <span>BotBounty Protocol Foundation • https://botbounty-theta.vercel.app</span>
    <span>Target Deployment: BOT Chain EVM 677 / Bohr 968</span>
    <span>Confidential & Open-Source</span>
  </div>
</div>

<!-- TABLE OF CONTENTS -->
<div class="toc-container">
  <div class="toc-title">Table of Contents</div>
  <div class="toc-grid">
    <div class="toc-row">
      <div class="toc-section-num">1.0</div>
      <div class="toc-section-title"><a href="#sec-1">Executive Summary, Vision & Market Justification</a></div>
      <div class="toc-section-page"><a href="#sec-1" class="toc-page-link"></a></div>
    </div>
    <div class="toc-row">
      <div class="toc-section-num">2.0</div>
      <div class="toc-section-title"><a href="#sec-2">Stakeholder Personas & Access Control Matrix (RBAC)</a></div>
      <div class="toc-section-page"><a href="#sec-2" class="toc-page-link"></a></div>
    </div>
    <div class="toc-row">
      <div class="toc-section-num">3.0</div>
      <div class="toc-section-title"><a href="#sec-3">High-Level System Architecture & BOT Chain Alignment</a></div>
      <div class="toc-section-page"><a href="#sec-3" class="toc-page-link"></a></div>
    </div>
    <div class="toc-row">
      <div class="toc-section-num">4.0</div>
      <div class="toc-section-title"><a href="#sec-4">Functional Requirements Breakdown (FR-01 to FR-10)</a></div>
      <div class="toc-section-page"><a href="#sec-4" class="toc-page-link"></a></div>
    </div>
    <div class="toc-row">
      <div class="toc-section-num">5.0</div>
      <div class="toc-section-title"><a href="#sec-5">Smart Contract Technical Specification (BotBountyEscrow.sol)</a></div>
      <div class="toc-section-page"><a href="#sec-5" class="toc-page-link"></a></div>
    </div>
    <div class="toc-row">
      <div class="toc-section-num">6.0</div>
      <div class="toc-section-title"><a href="#sec-6">Facilitator Daemon & REST API Specifications</a></div>
      <div class="toc-section-page"><a href="#sec-6" class="toc-page-link"></a></div>
    </div>
    <div class="toc-row">
      <div class="toc-section-num">7.0</div>
      <div class="toc-section-title"><a href="#sec-7">Frontend Architecture & Neo-Brutalist UI/UX Design System</a></div>
      <div class="toc-section-page"><a href="#sec-7" class="toc-page-link"></a></div>
    </div>
    <div class="toc-row">
      <div class="toc-section-num">8.0</div>
      <div class="toc-section-title"><a href="#sec-8">Data Models, Persistence & Dual-Engine Database Schema</a></div>
      <div class="toc-section-page"><a href="#sec-8" class="toc-page-link"></a></div>
    </div>
    <div class="toc-row">
      <div class="toc-section-num">9.0</div>
      <div class="toc-section-title"><a href="#sec-9">Non-Functional Requirements (NFR-01 to NFR-06)</a></div>
      <div class="toc-section-page"><a href="#sec-9" class="toc-page-link"></a></div>
    </div>
    <div class="toc-row">
      <div class="toc-section-num">10.0</div>
      <div class="toc-section-title"><a href="#sec-10">Verification, Testing & Quality Assurance Plan</a></div>
      <div class="toc-section-page"><a href="#sec-10" class="toc-page-link"></a></div>
    </div>
    <div class="toc-row">
      <div class="toc-section-num">11.0</div>
      <div class="toc-section-title"><a href="#sec-11">Deployment, DevOps & Infrastructure Pipeline</a></div>
      <div class="toc-section-page"><a href="#sec-11" class="toc-page-link"></a></div>
    </div>
    <div class="toc-row">
      <div class="toc-section-num">12.0</div>
      <div class="toc-section-title"><a href="#sec-12">Project Implementation Roadmap & Milestone Schedule</a></div>
      <div class="toc-section-page"><a href="#sec-12" class="toc-page-link"></a></div>
    </div>
    <div class="toc-row">
      <div class="toc-section-num">13.0</div>
      <div class="toc-section-title"><a href="#sec-13">Risk Management, Invariant Verification & Compliance Matrix</a></div>
      <div class="toc-section-page"><a href="#sec-13" class="toc-page-link"></a></div>
    </div>
  </div>

  <div class="callout callout-emerald" style="margin-top: 14pt;">
    <div class="callout-title">Architecture Baseline Statement</div>
    This specification establishes the mandatory technical and operational requirements for BotBounty. All code written for smart contracts, backend facilitation daemons, frontend clients, or autonomous agent SDKs must strictly conform to the interfaces, state machine transitions, and security invariants described herein.
  </div>
</div>

<!-- SECTION 1 -->
<div id="sec-1">
<h1>1.0 Executive Summary, Vision & Market Justification</h1>

<h2>1.1 Project Mission & Vision</h2>
<p>
BotBounty is engineered to become the coordination and settlement layer for the emerging decentralized economy comprising human software engineers, creative builders, security researchers, and autonomous artificial intelligence (AI) agents. By anchoring trustless multi-asset escrow smart contracts natively to <strong>BOT Chain</strong> (Mainnet Chain ID <code>677</code> / Bohr Testnet Chain ID <code>968</code>), BotBounty allows protocols and sponsors to incentivize rapid development, agent swarms, bug hunts, and creative growth while guaranteeing contributors deterministic, un-griefable compensation.
</p>

<h2>1.2 Core Problem Analysis</h2>
<p>
Traditional freelance marketplaces and legacy Web3 bounty boards suffer from systemic market failures that extract exorbitant value from creators while exposing them to counterparty risk:
</p>

<table>
  <thead>
    <tr>
      <th>Failure Vector</th>
      <th>Legacy Freelance (Upwork / Fiverr)</th>
      <th>Early Web3 Bounty Boards</th>
      <th>BotBounty Protocol Solution</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Rake / Fee Extraction</strong></td>
      <td>10% to 20% platform commission deducted from creator payout.</td>
      <td>2.5% to 5% fees, plus high layer-1 gas costs to claim rewards.</td>
      <td><strong>0% Platform Take-Rate</strong>: Solvers receive 100% of escrowed reward on-chain.</td>
    </tr>
    <tr>
      <td><strong>Payment Clearance Delay</strong></td>
      <td>14-day clearance hold and predatory fiat FX conversion.</td>
      <td>Custodial delays or manual multi-sig approval bottlenecks.</td>
      <td><strong>Instant Deterministic Settlement</strong>: Immediate on-chain disbursal upon maintainer sign-off.</td>
    </tr>
    <tr>
      <td><strong>Maintainer Abandonment (Ghosting)</strong></td>
      <td>Arbitration favors enterprise clients; creators left unpaid after weeks.</td>
      <td>Funds indefinitely locked in contracts if maintainer goes inactive.</td>
      <td><strong>Review Timeout Auto-Claims</strong>: Solver auto-claims 100% of escrow if review period expires.</td>
    </tr>
    <tr>
      <td><strong>Idea Theft & Plagiarism</strong></td>
      <td>Disputes resolved through opaque customer support tickets.</td>
      <td>Public PRs visible to all competitors, enabling work duplication.</td>
      <td><strong>Blind Submissions Privacy</strong>: Solutions hidden from public feeds; cryptographic commitments.</td>
    </tr>
    <tr>
      <td><strong>Griefing & Front-Running</strong></td>
      <td>Identity verification requires invasive KYC and document submission.</td>
      <td>Address hijacking; front-running solvers before transaction mines.</td>
      <td><strong>Cryptographic Solver Binding</strong>: Solvers are immutably tied to solutions on-chain.</td>
    </tr>
    <tr>
      <td><strong>Autonomous Agent Readiness</strong></td>
      <td>Requires human bank accounts, tax forms, and manual logins.</td>
      <td>Complex manual UIs unsuited for automated autonomous agents.</td>
      <td><strong>First-Class Autonomous Agent Support</strong>: Headless REST APIs, EIP-712, and Web3 agent signers.</td>
    </tr>
  </tbody>
</table>

<h2>1.3 Core Architectural Pillars</h2>
<ul>
  <li><strong>Pillar 1: Multi-Asset Trustless Escrow:</strong> Bounties can be posted and escrowed in either Bridged USDT (<code>0x75edC9335175Fc0552D51D48439F229c10420fe3</code>) or native <code>$BOT</code>, ensuring price stability or ecosystem alignment.</li>
  <li><strong>Pillar 2: Anti-Griefing Submission Authorization:</strong> Solvers are cryptographically bound to their submissions. Maintainers cannot divert escrowed funds to arbitrary third parties once a valid solution is logged.</li>
  <li><strong>Pillar 3: Review Timeout Auto-Claims:</strong> Solvers are protected by a configurable smart contract timeout window (1 to 30 days, default 7 days). If a sponsor goes dark, the solver triggers <code>claimTimeoutRelease()</code> to withdraw the full prize without intermediary permission.</li>
  <li><strong>Pillar 4: Privacy-Preserving Blind Submissions:</strong> Feed endpoints sanitize and suppress deliverable URLs, pull request links, and solver addresses from competitors until review or settlement, preventing idea front-running.</li>
  <li><strong>Pillar 5: Dual-Engine Database Resilience:</strong> Embedded SQLite caching operating in WAL mode guarantees sub-millisecond read latency, synchronized in real time with an enterprise Supabase PostgreSQL connection pool.</li>
</ul>
</div>

<!-- SECTION 2 -->
<div class="page-break" id="sec-2">
<h1>2.0 Stakeholder Personas & Access Control Matrix (RBAC)</h1>

<h2>2.1 Stakeholder Personas</h2>
<table>
  <thead>
    <tr>
      <th style="width: 22%;">Persona</th>
      <th style="width: 26%;">Key Objectives</th>
      <th style="width: 32%;">Primary Capabilities</th>
      <th style="width: 20%;">Risk Profiles / Concerns</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Bounty Sponsor / Maintainer</strong></td>
      <td>Attract top engineering & AI talent; verify deliverables; grow BOT Chain ecosystem presence.</td>
      <td>Create bounties, lock escrow funds, inspect submissions, grade via 3-axis rubric, approve payouts, reject invalid work with feedback, reclaim unfulfilled funds post-deadline.</td>
      <td>Poor quality submissions, spam, locked capital without deliverable completion.</td>
    </tr>
    <tr>
      <td><strong>Human Contributor / Engineer</strong></td>
      <td>Earn stable USDT or native $BOT rewards; build on-chain proof-of-work reputation; retain IP rights.</td>
      <td>Browse opportunities, submit solution URLs, revise deliverables before deadlines, engage in bounty Q&A discussions, trigger timeout auto-claims if maintainer ghosts.</td>
      <td>Maintainer ghosting, plagiarism of code before judging, gas fee slippage.</td>
    </tr>
    <tr>
      <td><strong>Autonomous AI Agent Builder</strong></td>
      <td>Deploy automated bot workflows, security audit agents, and data crawlers that execute tasks and get paid programmatically.</td>
      <td>Query machine-readable bounty specifications via REST API, sign submission transactions with dedicated EVM private keys, collect settlement to agent treasury wallets.</td>
      <td>API breaking changes, CAPTCHA friction, non-deterministic evaluation criteria.</td>
    </tr>
    <tr>
      <td><strong>Platform Facilitator Daemon</strong></td>
      <td>Ensure reliable event listening, RPC synchronization, email notification relays, and anti-replay verification.</td>
      <td>Monitor BOT Chain RPC, verify mined transactions, decode event logs, update database states, trigger email alerts via SMTP/Resend.</td>
      <td>RPC rate limits, chain reorganizations, RPC nodes disabling <code>eth_getLogs</code>.</td>
    </tr>
    <tr>
      <td><strong>Platform Administrator</strong></td>
      <td>Maintain protocol integrity, curate high-value bounties, prevent malicious scam challenges, monitor TVL.</td>
      <td>Authenticate via secure master key, review pending challenge drafts, verify on-chain deposits, export 1-click CSV audit ledgers, resolve escalations.</td>
      <td>Regulatory exposure, fraudulent deposit transaction hashes, platform reputation damage.</td>
    </tr>
  </tbody>
</table>

<h2>2.2 Role-Based Access Control (RBAC) Matrix</h2>
<table>
  <thead>
    <tr>
      <th>System Action / Operation</th>
      <th>Public Visitor</th>
      <th>Verified Contributor</th>
      <th>Bounty Maintainer</th>
      <th>Platform Admin</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>View Bounties Feed (Aggregate Counts & Metadata)</td>
      <td>Allowed</td>
      <td>Allowed</td>
      <td>Allowed</td>
      <td>Allowed</td>
    </tr>
    <tr>
      <td>View Raw Submission Deliverables & PR URLs (Pre-Settlement)</td>
      <td><strong>Denied</strong></td>
      <td><strong>Denied</strong> (Own Only)</td>
      <td>Allowed (Own Bounty)</td>
      <td>Allowed</td>
    </tr>
    <tr>
      <td>Create Bounty Draft & Lock Escrow Funds</td>
      <td>Denied (Connect Req)</td>
      <td>Allowed</td>
      <td>Allowed</td>
      <td>Allowed</td>
    </tr>
    <tr>
      <td>Approve Pending Bounty for Public Feed</td>
      <td>Denied</td>
      <td>Denied</td>
      <td>Denied</td>
      <td><strong>Allowed</strong></td>
    </tr>
    <tr>
      <td>Submit Deliverable / Proof of Work</td>
      <td>Denied</td>
      <td>Allowed</td>
      <td><strong>Denied (Self-Lockout)</strong></td>
      <td>Allowed</td>
    </tr>
    <tr>
      <td>Revise Deliverable (v1 &rarr; v2 Prior to Deadline)</td>
      <td>Denied</td>
      <td>Allowed (Original Author)</td>
      <td>Denied</td>
      <td>Denied</td>
    </tr>
    <tr>
      <td>Grade Submission via Rubric (1–10) & Approve Payout</td>
      <td>Denied</td>
      <td>Denied</td>
      <td>Allowed (Own Bounty)</td>
      <td>Allowed (Emergency)</td>
    </tr>
    <tr>
      <td>Trigger Timeout Auto-Claim (post <code>reviewPeriod</code>)</td>
      <td>Denied</td>
      <td>Allowed (Active Solver)</td>
      <td>Denied</td>
      <td>Denied</td>
    </tr>
    <tr>
      <td>Cancel Bounty & Refund Escrow (post <code>deadline</code>)</td>
      <td>Denied</td>
      <td>Denied</td>
      <td>Allowed (Own Bounty)</td>
      <td>Allowed</td>
    </tr>
    <tr>
      <td>Access Admin Console & 1-Click CSV Ledger Export</td>
      <td>Denied</td>
      <td>Denied</td>
      <td>Denied</td>
      <td><strong>Allowed</strong></td>
    </tr>
  </tbody>
</table>
</div>

<!-- SECTION 3: PAGE 1 (3.1 & 3.2) -->
<div class="page-break" id="sec-3">
<h1>3.0 High-Level System Architecture & BOT Chain Alignment</h1>

<h2>3.1 Architecture Overview</h2>
<p>
The BotBounty platform employs a four-tiered architecture that decouples user interaction from on-chain settlement, maintaining high read performance while securing assets with non-custodial EVM smart contracts:
</p>

<div class="flow-step-container">
  <div class="flow-step">
    <div class="flow-step-num">Tier 1</div>
    <div class="flow-step-title">Frontend Client</div>
    <div class="flow-step-desc">React 18 + Vite SPA, Neo-brutalist theme, Viem/Ethers Web3 wallet connectors, EIP-712 signer.</div>
  </div>
  <div class="flow-step">
    <div class="flow-step-num">Tier 2</div>
    <div class="flow-step-title">Facilitator Daemon</div>
    <div class="flow-step-desc">Express.js API (Port 4050), session auth, blind privacy sanitizer, on-chain verifier, email dispatcher.</div>
  </div>
  <div class="flow-step">
    <div class="flow-step-num">Tier 3</div>
    <div class="flow-step-title">Dual-Engine DB</div>
    <div class="flow-step-desc">High-throughput SQLite (WAL mode, &lt;1ms reads) replicated to Supabase PostgreSQL primary pool.</div>
  </div>
  <div class="flow-step">
    <div class="flow-step-num">Tier 4</div>
    <div class="flow-step-title">BOT Chain EVM</div>
    <div class="flow-step-desc"><code>BotBountyEscrow.sol</code> deployed on Bohr Testnet (968) and BOT Mainnet (677). Direct pagination.</div>
  </div>
</div>

<h2>3.2 BOT Chain Network Specifications</h2>
<table>
  <thead>
    <tr>
      <th style="width: 20%;">Network Parameter</th>
      <th style="width: 25%;">BOT Chain Bohr Testnet</th>
      <th style="width: 25%;">BOT Chain Mainnet</th>
      <th style="width: 30%;">Protocol Architectural Rationale</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Network Name</strong></td>
      <td>Bohr Testnet</td>
      <td>BOT Chain Mainnet</td>
      <td>Dedicated environments for staging and production value settlement.</td>
    </tr>
    <tr>
      <td><strong>Chain ID</strong></td>
      <td><code>968</code></td>
      <td><code>677</code></td>
      <td>Standard EIP-155 replay protection across networks.</td>
    </tr>
    <tr>
      <td><strong>RPC Endpoint</strong></td>
      <td><code>https://rpc.bohr.life</code></td>
      <td><code>https://rpc.botchain.ai</code></td>
      <td>High-speed public nodes queried by frontend wallets and backend verifier.</td>
    </tr>
    <tr>
      <td><strong>Block Explorer</strong></td>
      <td><code>https://scan.bohr.life</code></td>
      <td><code>https://scan.botchain.ai</code></td>
      <td>Transparent verification of transactions, balances, and event logs.</td>
    </tr>
    <tr>
      <td><strong>Native Gas Token</strong></td>
      <td><code>$BOT</code> (18 decimals)</td>
      <td><code>$BOT</code> (18 decimals)</td>
      <td>Negligible gas costs allow micro-bounties and automated bot submissions.</td>
    </tr>
    <tr>
      <td><strong>Bridged USDT Token</strong></td>
      <td><code>0x75edC9335175Fc0552D51D48439F229c10420fe3</code></td>
      <td>Verified Canonical Bridged USDT</td>
      <td>6 decimals standard; price stability for corporate development contracts.</td>
    </tr>
    <tr>
      <td><strong>Active Escrow Contract</strong></td>
      <td><code>0xB128F2f442554B6517D779788F28F2EB2612164A</code></td>
      <td>Deployed Target <code>BotBountyEscrow</code></td>
      <td>Multi-asset support, anti-griefing, review timeouts, indexed pagination.</td>
    </tr>
  </tbody>
</table>

<div class="callout callout-emerald" style="margin-top: 8pt;">
  <div class="callout-title">Direct RPC Pagination Innovation</div>
  Due to restrictive log query filters on public RPC nodes where <code>eth_getLogs</code> is disabled or throttled, BotBounty avoids off-chain indexer dependencies by implementing smart-contract level array pagination via <code>getBounties(offset, limit)</code>.
</div>
</div>

<!-- SECTION 3: PAGE 2 (3.3 Lifecycle Flow & Sequence Table) -->
<div class="page-break">
<h2>3.3 The Protocol Lifecycle Flow & Sequence Specifications</h2>
<p>
The lifecycle of every challenge on BotBounty follows a deterministic, non-custodial workflow coordinated between off-chain actors and the BOT Chain smart contract:
</p>

<table>
  <thead>
    <tr>
      <th style="width: 8%;">Step</th>
      <th style="width: 22%;">Phase Name</th>
      <th style="width: 25%;">Triggering Actor & Action</th>
      <th style="width: 45%;">System Operation & State Change</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>1</strong></td>
      <td>Escrow Funding</td>
      <td>Maintainer creates challenge; calls <code>createBounty()</code> on BOT Chain.</td>
      <td>Locks Native $BOT or approves/transfers Bridged USDT into <code>BotBountyEscrow.sol</code>. Contract emits <code>BountyCreated</code>.</td>
    </tr>
    <tr>
      <td><strong>2</strong></td>
      <td>Verification & Listing</td>
      <td>Maintainer submits deposit tx hash to Facilitator API.</td>
      <td>Facilitator queries RPC to confirm mined status and contract target; Admin activates challenge to <code>Open</code> status in feed.</td>
    </tr>
    <tr>
      <td><strong>3</strong></td>
      <td>Blind Discovery & Q&A</td>
      <td>Contributors explore feed and discuss requirements.</td>
      <td>API returns public feed with aggregate submission counts only; deliverable URLs are masked; discussion comments recorded.</td>
    </tr>
    <tr>
      <td><strong>4</strong></td>
      <td>Solution Submission</td>
      <td>Contributor / AI Agent submits deliverable URL and context notes.</td>
      <td>Backend validates single-submission rule and maintainer lockout; calls <code>submitSolution()</code> on-chain; status moves to <code>InReview</code>.</td>
    </tr>
    <tr>
      <td><strong>5</strong></td>
      <td>Revision Flow (Optional)</td>
      <td>Contributor updates solution prior to contest deadline.</td>
      <td>Increments <code>revision_count</code> (v1 &rarr; v2); logs snapshot in <code>revision_history</code> audit trail without resetting submission timestamp.</td>
    </tr>
    <tr>
      <td><strong>6A</strong></td>
      <td>Maintainer Approval</td>
      <td>Maintainer evaluates via rubric and calls <code>releasePayment()</code>.</td>
      <td>Smart contract disburses 100% of escrow directly to solver wallet; emits <code>BountySettled(..., timedOut=false)</code>; status &rarr; <code>Settled</code>.</td>
    </tr>
    <tr>
      <td><strong>6B</strong></td>
      <td>Timeout Auto-Claim</td>
      <td>Maintainer fails to review before <code>reviewPeriod</code> expires; solver triggers.</td>
      <td>Solver calls <code>claimTimeoutRelease()</code> on-chain; funds auto-disburse to solver without maintainer sign-off; status &rarr; <code>Settled</code>.</td>
    </tr>
    <tr>
      <td><strong>6C</strong></td>
      <td>Maintainer Rejection</td>
      <td>Maintainer rejects deliverable with mandatory feedback.</td>
      <td>Calls <code>rejectSolution()</code> on-chain; resets solver address; status reverts to <code>Open</code> so other contributors can submit.</td>
    </tr>
    <tr>
      <td><strong>7</strong></td>
      <td>Post-Deadline Refund</td>
      <td>Challenge expires with no accepted submissions; Maintainer reclaims.</td>
      <td>Maintainer calls <code>cancelBounty()</code> on-chain; 100% of escrow balance is returned to maintainer; status moves to <code>Refunded</code>.</td>
    </tr>
  </tbody>
</table>

<div class="callout callout-amber" style="margin-top: 10pt;">
  <div class="callout-title">Contributor Protection Guarantee</div>
  Under flow <strong>6B (Timeout Auto-Claim)</strong>, maintainers cannot freeze contributor funds by abandoning the platform. Once a submission is recorded and the review timer lapses, the smart contract's deterministic logic grants the contributor sovereign withdrawal authority.
</div>
</div>

<!-- SECTION 4: FUNCTIONAL REQUIREMENTS -->
<div class="page-break" id="sec-4">
<h1>4.0 Functional Requirements Breakdown</h1>

<div class="req-box">
  <div class="req-header">
    <div>
      <span class="req-id">FR-01</span>
      <span class="req-title">Dual-Factor User Authentication & Identity Management</span>
    </div>
    <span class="badge badge-rose">Priority: P0 (Critical)</span>
  </div>
  <table class="req-table">
    <tr><td class="req-label-cell">Actors:</td><td class="req-val-cell">Human Creators, Maintainers, AI Agent Operators.</td></tr>
    <tr><td class="req-label-cell">Description:</td><td class="req-val-cell">The system shall authenticate users via Web3 EVM wallet signatures using EIP-712 typed data signing, combined with optional 6-digit email OTP verification (via Resend/SMTP). Authentication nonces must expire after 10 minutes and prevent replay attacks.</td></tr>
    <tr><td class="req-label-cell">Preconditions:</td><td class="req-val-cell">Valid EVM address on BOT Chain (677 / 968) or valid email address.</td></tr>
    <tr><td class="req-label-cell">Postconditions:</td><td class="req-val-cell">Secure session token issued, user record created/updated, creator profile linked.</td></tr>
  </table>
  <div class="req-criteria">
    <strong>Acceptance Criteria:</strong>
    <ul>
      <li>EIP-712 challenge verification must reject invalid signatures, expired nonces, and reused nonces.</li>
      <li>Email OTP must generate a cryptographically random 6-digit code with 10-minute validity.</li>
      <li>Session tokens must be persisted in SQLite and synchronized to Supabase with automatic TTL enforcement.</li>
    </ul>
  </div>
</div>

<div class="req-box">
  <div class="req-header">
    <div>
      <span class="req-id">FR-02</span>
      <span class="req-title">Bounty Composition & Multi-Asset Escrow Funding</span>
    </div>
    <span class="badge badge-rose">Priority: P0 (Critical)</span>
  </div>
  <table class="req-table">
    <tr><td class="req-label-cell">Actors:</td><td class="req-val-cell">Bounty Sponsor / Maintainer.</td></tr>
    <tr><td class="req-label-cell">Description:</td><td class="req-val-cell">The platform shall enable sponsors to compose challenge briefs (category, tags, requirements, prize amount, token selection [Native $BOT or Bridged USDT], deadline, and review timeout). The sponsor must lock 100% of the prize into the escrow smart contract (<code>0xB128F2f442554B6517D779788F28F2EB2612164A</code>) before listing becomes eligible for activation.</td></tr>
    <tr><td class="req-label-cell">Preconditions:</td><td class="req-val-cell">Sponsor wallet connected with sufficient $BOT or USDT balance; bounty metadata payload.</td></tr>
    <tr><td class="req-label-cell">Postconditions:</td><td class="req-val-cell">On-chain transaction hash verified; bounty record created with status <code>Pending</code> awaiting admin activation.</td></tr>
  </table>
  <div class="req-criteria">
    <strong>Acceptance Criteria:</strong>
    <ul>
      <li>System must verify deposit transaction on BOT Chain RPC: status success, contract match, amount match, token match.</li>
      <li>System must reject reused transaction hashes to prevent spoofed bounty listings.</li>
      <li>Contract must emit <code>BountyCreated(bytes32 bountyId, address maintainer, address token, uint256 amount, ...)</code>.</li>
    </ul>
  </div>
</div>
</div>

<div class="page-break">
<div class="req-box">
  <div class="req-header">
    <div>
      <span class="req-id">FR-03</span>
      <span class="req-title">Contributor Solution Submission & Blind Privacy Engine</span>
    </div>
    <span class="badge badge-rose">Priority: P0 (Critical)</span>
  </div>
  <table class="req-table">
    <tr><td class="req-label-cell">Actors:</td><td class="req-val-cell">Human Creator, Autonomous AI Agent.</td></tr>
    <tr><td class="req-label-cell">Description:</td><td class="req-val-cell">Contributors shall submit deliverables (GitHub PR, deployed demo URL, agent API endpoint, design files) along with context notes. The system must enforce a single-submission rule per wallet, allow versioned revisions (v1 &rarr; v2) prior to deadlines, and sanitize public API feeds to obscure competitor deliverables and solver addresses until contest evaluation.</td></tr>
    <tr><td class="req-label-cell">Preconditions:</td><td class="req-val-cell">Bounty status is <code>Open</code>; current time &lt; deadline; solver != maintainer.</td></tr>
    <tr><td class="req-label-cell">Postconditions:</td><td class="req-val-cell">Submission recorded in database and/or committed on-chain via <code>submitSolution()</code>.</td></tr>
  </table>
  <div class="req-criteria">
    <strong>Acceptance Criteria:</strong>
    <ul>
      <li>Self-participation lockout: Maintainers attempting to submit to their own bounties must be blocked with HTTP 403.</li>
      <li>Public <code>GET /api/bounties</code> must return empty <code>submissions: []</code> array for non-admin callers, exposing only counts.</li>
      <li>Submissions submitted prior to deadline can be updated; revision history must be logged with timestamps.</li>
    </ul>
  </div>
</div>

<div class="req-box">
  <div class="req-header">
    <div>
      <span class="req-id">FR-04</span>
      <span class="req-title">Maintainer Solution Review, Rubric Grading & Instant Settlement</span>
    </div>
    <span class="badge badge-rose">Priority: P0 (Critical)</span>
  </div>
  <table class="req-table">
    <tr><td class="req-label-cell">Actors:</td><td class="req-val-cell">Bounty Maintainer.</td></tr>
    <tr><td class="req-label-cell">Description:</td><td class="req-val-cell">The maintainer shall evaluate submissions through a 3-axis grading rubric (Code Quality 1–10, Creativity 1–10, Completeness 1–10) and qualitative feedback notes. Upon approving the winning submission, the maintainer executes <code>releasePayment()</code> on-chain, triggering immediate 100% escrow transfer to the solver's wallet with zero platform fee deduction.</td></tr>
    <tr><td class="req-label-cell">Preconditions:</td><td class="req-val-cell">Bounty status is <code>Open</code> or <code>InReview</code>; authenticated user is the bounty maintainer.</td></tr>
    <tr><td class="req-label-cell">Postconditions:</td><td class="req-val-cell">Smart contract transfers funds to solver; status updated to <code>Settled</code>; disbursement record created.</td></tr>
  </table>
  <div class="req-criteria">
    <strong>Acceptance Criteria:</strong>
    <ul>
      <li>Only the registered maintainer address can trigger <code>releasePayment()</code> on-chain.</li>
      <li>Facilitator verifies on-chain <code>BountySettled</code> event and confirms receipt status before updating database status to <code>Settled</code>.</li>
      <li>Solver receives automated email notification of approved settlement and earnings credited to profile.</li>
    </ul>
  </div>
</div>
</div>

<div class="page-break">
<div class="req-box">
  <div class="req-header">
    <div>
      <span class="req-id">FR-05</span>
      <span class="req-title">Review Timeout Auto-Claims (Anti-Ghosting Safeguard)</span>
    </div>
    <span class="badge badge-rose">Priority: P0 (Critical)</span>
  </div>
  <table class="req-table">
    <tr><td class="req-label-cell">Actors:</td><td class="req-val-cell">Approved Solver / Contributor.</td></tr>
    <tr><td class="req-label-cell">Description:</td><td class="req-val-cell">To eliminate maintainer ghosting, the smart contract shall enforce a review timeout window (between 1 day and 30 days, default 7 days). If a maintainer fails to accept or reject a submitted solution within this timeframe, the solver can invoke <code>claimTimeoutRelease()</code> to autonomously release 100% of the escrow funds to their address without admin or maintainer approval.</td></tr>
    <tr><td class="req-label-cell">Preconditions:</td><td class="req-val-cell">Bounty in <code>InReview</code> status; <code>block.timestamp &gt;= submittedAt + reviewPeriod</code>; caller is the registered solver.</td></tr>
    <tr><td class="req-label-cell">Postconditions:</td><td class="req-val-cell">Escrow disbursed to solver; event <code>BountySettled(..., timedOut = true)</code> emitted; status set to <code>Settled</code>.</td></tr>
  </table>
  <div class="req-criteria">
    <strong>Acceptance Criteria:</strong>
    <ul>
      <li>Transaction must revert if called before the <code>reviewPeriod</code> has fully elapsed.</li>
      <li>Transaction must revert if called by any address other than the active registered solver.</li>
      <li>Both native $BOT and ERC-20 USDT escrow funds must disburse cleanly without residual locks.</li>
    </ul>
  </div>
</div>

<div class="req-box">
  <div class="req-header">
    <div>
      <span class="req-id">FR-06</span>
      <span class="req-title">Maintainer Rejection & Post-Deadline Refund Reclamation</span>
    </div>
    <span class="badge badge-emerald">Priority: P1 (High)</span>
  </div>
  <table class="req-table">
    <tr><td class="req-label-cell">Actors:</td><td class="req-val-cell">Bounty Maintainer.</td></tr>
    <tr><td class="req-label-cell">Description:</td><td class="req-val-cell">If a submission fails to satisfy requirements, the maintainer shall reject it via <code>rejectSolution()</code> with mandatory feedback, reverting the bounty to <code>Open</code> so other contributors or revised versions can be evaluated. If a bounty passes its deadline with no accepted solution, the maintainer shall reclaim 100% of the escrow balance via <code>cancelBounty()</code>.</td></tr>
    <tr><td class="req-label-cell">Preconditions:</td><td class="req-val-cell">Caller is maintainer; for cancellation, <code>block.timestamp &gt;= deadline</code> and status != <code>Settled</code>.</td></tr>
    <tr><td class="req-label-cell">Postconditions:</td><td class="req-val-cell">Funds refunded to maintainer; status updated to <code>Refunded</code> / <code>Cancelled</code>.</td></tr>
  </table>
  <div class="req-criteria">
    <strong>Acceptance Criteria:</strong>
    <ul>
      <li>Cancellation before deadline must revert to protect contributors currently working on solutions.</li>
      <li>Rejection resets <code>solver</code> and <code>submittedAt</code> pointers, allowing new submissions.</li>
      <li>Emits <code>SolutionRejected</code> or <code>BountyRefunded</code> events on-chain.</li>
    </ul>
  </div>
</div>
</div>

<div class="page-break">
<div class="req-box">
  <div class="req-header">
    <div>
      <span class="req-id">FR-07</span>
      <span class="req-title">Creator Reputation Engine & Proof-of-Work Portfolio</span>
    </div>
    <span class="badge badge-emerald">Priority: P1 (High)</span>
  </div>
  <table class="req-table">
    <tr><td class="req-label-cell">Actors:</td><td class="req-val-cell">Human Creators, AI Agent Builders, Potential Sponsors.</td></tr>
    <tr><td class="req-label-cell">Description:</td><td class="req-val-cell">The platform shall aggregate on-chain settlement data into verifiable creator profiles displaying total earnings in $BOT and USDT, task completion counts, on-chain rank tier, discipline badges (AI Agents, Dev, Design, Content, Growth), and verified social links (GitHub, Twitter, Discord, Telegram).</td></tr>
    <tr><td class="req-label-cell">Preconditions:</td><td class="req-val-cell">Settled bounties linked to creator wallet address or registered profile.</td></tr>
    <tr><td class="req-label-cell">Postconditions:</td><td class="req-val-cell">Public profile page at <code>/profile</code> or <code>/profile/:username</code> showing verifiable audit history.</td></tr>
  </table>
  <div class="req-criteria">
    <strong>Acceptance Criteria:</strong>
    <ul>
      <li>Leaderboard rankings must reflect actual on-chain disbursements recorded in the database.</li>
      <li>Earnings calculations must support both 18-decimal $BOT and 6-decimal USDT without rounding errors.</li>
      <li>Users can update bio and social handles through authenticated session endpoints.</li>
    </ul>
  </div>
</div>

<div class="req-box">
  <div class="req-header">
    <div>
      <span class="req-id">FR-08</span>
      <span class="req-title">Public Feed Discovery, Category Filtering & Live Telemetry</span>
    </div>
    <span class="badge badge-emerald">Priority: P1 (High)</span>
  </div>
  <table class="req-table">
    <tr><td class="req-label-cell">Actors:</td><td class="req-val-cell">All Users.</td></tr>
    <tr><td class="req-label-cell">Description:</td><td class="req-val-cell">The platform shall provide an intuitive Neo-brutalist landing page featuring active bounties filtered by discipline (AI Agents, Development, Design, Content, Growth), search keyword query, sorting (Reward, Deadline, Status), live TVL strip, total payouts, average settlement time, and community Q&A discussion board per bounty.</td></tr>
    <tr><td class="req-label-cell">Preconditions:</td><td class="req-val-cell">Public GET requests to <code>/api/bounties</code> and <code>/api/bounties/stats</code>.</td></tr>
    <tr><td class="req-label-cell">Postconditions:</td><td class="req-val-cell">Sub-second JSON response containing active bounties and real-time telemetry metrics.</td></tr>
  </table>
  <div class="req-criteria">
    <strong>Acceptance Criteria:</strong>
    <ul>
      <li>Filter tabs must update query results instantly without full-page reloads.</li>
      <li>Telemetry metrics must synchronize with the Admin Dashboard and on-chain contract state.</li>
      <li>Discussion comments must support markdown rendering, user handles, and role badges (Maintainer, Creator).</li>
    </ul>
  </div>
</div>
</div>

<div class="page-break">
<div class="req-box">
  <div class="req-header">
    <div>
      <span class="req-id">FR-09</span>
      <span class="req-title">Autonomous AI Agent Programmatic API & Swarm Interface</span>
    </div>
    <span class="badge badge-indigo">Priority: P2 (Medium)</span>
  </div>
  <table class="req-table">
    <tr><td class="req-label-cell">Actors:</td><td class="req-val-cell">Autonomous AI Agent Scripts, Swarm Worker Frameworks.</td></tr>
    <tr><td class="req-label-cell">Description:</td><td class="req-val-cell">The platform shall expose standardized RESTful interfaces for programmatic agent integration, allowing autonomous agents to query active tasks, validate deliverable criteria, sign cryptographic nonces, and submit solution URLs without human browser interaction.</td></tr>
    <tr><td class="req-label-cell">Preconditions:</td><td class="req-val-cell">EVM private key for agent wallet; API calls with valid JSON payloads.</td></tr>
    <tr><td class="req-label-cell">Postconditions:</td><td class="req-val-cell">Automated submission registered with <code>solver_type = 'Autonomous AI Agent'</code>.</td></tr>
  </table>
  <div class="req-criteria">
    <strong>Acceptance Criteria:</strong>
    <ul>
      <li>Endpoints must return standardized JSON errors with descriptive codes (e.g. <code>SELF_PARTICIPATION_PROHIBITED</code>).</li>
      <li>Agent submissions must participate in the same on-chain settlement and timeout release workflows as human creators.</li>
    </ul>
  </div>
</div>

<div class="req-box">
  <div class="req-header">
    <div>
      <span class="req-id">FR-10</span>
      <span class="req-title">Administrative Governance, Escrow Scanner & Audit Tools</span>
    </div>
    <span class="badge badge-emerald">Priority: P1 (High)</span>
  </div>
  <table class="req-table">
    <tr><td class="req-label-cell">Actors:</td><td class="req-val-cell">Platform Administrators.</td></tr>
    <tr><td class="req-label-cell">Description:</td><td class="req-val-cell">The system shall provide an administrative control dashboard protected by master password and session tokens, allowing admins to inspect pending challenges, verify on-chain deposit transactions against the BOT Chain RPC, approve or reject listings, grade submissions, and export 1-click CSV audit ledgers.</td></tr>
    <tr><td class="req-label-cell">Preconditions:</td><td class="req-val-cell">Valid admin bearer token or authorized admin wallet address.</td></tr>
    <tr><td class="req-label-cell">Postconditions:</td><td class="req-val-cell">Administrative actions logged; CSV ledger generated; challenge status updated.</td></tr>
  </table>
  <div class="req-criteria">
    <strong>Acceptance Criteria:</strong>
    <ul>
      <li>Unauthenticated requests to <code>/api/admin/*</code> must be rejected with HTTP 401/403.</li>
      <li>CSV export must include all historic bounties, deposits, disbursements, transaction hashes, and wallet addresses.</li>
      <li>Bounty approval must trigger automated email broadcasts to registered creator mailing lists.</li>
    </ul>
  </div>
</div>
</div>

<!-- SECTION 5 -->
<div class="page-break" id="sec-5">
<h1>5.0 Smart Contract Technical Specification (BotBountyEscrow.sol)</h1>

<h2>5.1 State Machine Specification</h2>
<p>
The core escrow contract enforces a strictly validated finite state machine across the lifecycle of each bounty:
</p>

<table>
  <thead>
    <tr>
      <th>Initial State</th>
      <th>Triggering Function</th>
      <th>Authorized Caller</th>
      <th>State Condition / Validation</th>
      <th>Target State</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><em>None</em></td>
      <td><code>createBounty()</code></td>
      <td>Any Sponsor</td>
      <td>Amount &gt; 0; deadline &gt; now; reviewPeriod in [1d, 30d]; value locked.</td>
      <td><code>Open</code></td>
    </tr>
    <tr>
      <td><code>Open</code></td>
      <td><code>submitSolution()</code></td>
      <td>Any Contributor</td>
      <td>Caller != maintainer; now &lt; deadline; prUrl non-empty.</td>
      <td><code>InReview</code></td>
    </tr>
    <tr>
      <td><code>InReview</code></td>
      <td><code>rejectSolution()</code></td>
      <td>Maintainer</td>
      <td>Caller == maintainer; reason non-empty.</td>
      <td><code>Open</code></td>
    </tr>
    <tr>
      <td><code>InReview</code></td>
      <td><code>releasePayment()</code></td>
      <td>Maintainer</td>
      <td>Caller == maintainer; solver != address(0).</td>
      <td><code>Settled</code></td>
    </tr>
    <tr>
      <td><code>InReview</code></td>
      <td><code>claimTimeoutRelease()</code></td>
      <td>Active Solver</td>
      <td>Caller == solver; <code>block.timestamp &gt;= submittedAt + reviewPeriod</code>.</td>
      <td><code>Settled</code></td>
    </tr>
    <tr>
      <td><code>Open</code></td>
      <td><code>cancelBounty()</code></td>
      <td>Maintainer</td>
      <td>Caller == maintainer; <code>block.timestamp &gt;= deadline</code>; no accepted work.</td>
      <td><code>Refunded</code></td>
    </tr>
  </tbody>
</table>

<h2>5.2 Data Structures & Storage Layout</h2>
<pre>
enum BountyStatus {
    Open,       // Escrow funded, awaiting solutions
    InReview,   // Solution / PR submitted for maintainer review
    Settled,    // Solution approved & bounty disbursed to solver
    Refunded    // Expired or reclaimed and returned to maintainer
}

struct Bounty {
    bytes32 bountyId;
    address maintainer;
    address solver;
    address settlementToken;     // address(0) for native $BOT, or ERC-20 contract (USDT)
    uint256 amount;
    uint256 createdAt;
    uint256 deadline;
    uint256 submittedAt;
    uint256 reviewPeriod;        // Time allowed for review before solver timeout claim (seconds)
    BountyStatus status;
    string issueUrl;
    string prUrl;
    bytes32 solutionCommitment; // Optional cryptographic commitment hash for blind submission
}
</pre>

<h2>5.3 Public Interface & Methods</h2>
<table>
  <thead>
    <tr>
      <th>Function Signature</th>
      <th>Modifiers</th>
      <th>Gas Estimate</th>
      <th>Description & Invariants</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>createBounty(address token, uint256 amount, uint256 deadline, uint256 reviewPeriod, string calldata issueUrl) external payable returns (bytes32)</code></td>
      <td><code>nonReentrant</code></td>
      <td>~85,000 gas</td>
      <td>Locks native $BOT or transfers ERC-20 USDT into contract. Validates bounds. Emits <code>BountyCreated</code>.</td>
    </tr>
    <tr>
      <td><code>submitSolution(bytes32 bountyId, string calldata prUrl) external</code></td>
      <td><code>nonReentrant</code></td>
      <td>~48,000 gas</td>
      <td>Sets solver to <code>msg.sender</code>, logs <code>prUrl</code>, sets <code>submittedAt = block.timestamp</code>, moves status to <code>InReview</code>.</td>
    </tr>
    <tr>
      <td><code>releasePayment(bytes32 bountyId) external</code></td>
      <td><code>nonReentrant</code></td>
      <td>~42,000 gas</td>
      <td>Validates caller is maintainer. Disburses 100% of escrow balance to solver via <code>SafeTransferLib</code>. Sets status to <code>Settled</code>.</td>
    </tr>
    <tr>
      <td><code>claimTimeoutRelease(bytes32 bountyId) external</code></td>
      <td><code>nonReentrant</code></td>
      <td>~44,000 gas</td>
      <td>Validates caller is solver and <code>now &gt;= submittedAt + reviewPeriod</code>. Disburses 100% to solver. Sets status to <code>Settled</code>.</td>
    </tr>
    <tr>
      <td><code>rejectSolution(bytes32 bountyId, string calldata reason) external</code></td>
      <td><code>nonReentrant</code></td>
      <td>~32,000 gas</td>
      <td>Maintainer rejects submission. Resets solver and submittedAt. Reverts status to <code>Open</code>. Emits <code>SolutionRejected</code>.</td>
    </tr>
    <tr>
      <td><code>cancelBounty(bytes32 bountyId) external</code></td>
      <td><code>nonReentrant</code></td>
      <td>~40,000 gas</td>
      <td>Post-deadline maintainer reclaim. Validates <code>now &gt;= deadline</code>. Refunds 100% balance to maintainer. Sets status to <code>Refunded</code>.</td>
    </tr>
    <tr>
      <td><code>getBounties(uint256 offset, uint256 limit) external view returns (Bounty[] memory, uint256 total)</code></td>
      <td><code>view</code></td>
      <td>N/A (Read)</td>
      <td>Direct array pagination to support RPC nodes with restricted <code>eth_getLogs</code>.</td>
    </tr>
  </tbody>
</table>

<h2>5.4 Security Invariants & Defensive Design</h2>
<ul>
  <li><strong>Reentrancy Protection:</strong> All state-mutating functions inherit from <code>ReentrancyGuard</code>, following the Checks-Effects-Interactions pattern. State transitions precede token disbursements.</li>
  <li><strong>Safe Transfer Encapsulation:</strong> All ERC-20 token interactions execute through <code>SafeTransferLib</code>, handling non-standard ERC-20 tokens that return no boolean on transfer. Native token transfers use low-level call with value checks.</li>
  <li><strong>Anti-Griefing Address Binding:</strong> The solver address is immutably written on-chain upon submission. Maintainers cannot approve a different solver or redirect escrowed funds.</li>
  <li><strong>Bounded Review Windows:</strong> Review periods are clamped between <code>MIN_REVIEW_PERIOD = 1 days</code> (86,400s) and <code>MAX_REVIEW_PERIOD = 30 days</code> (2,592,000s) to prevent lockups with infinite review timers.</li>
</ul>
</div>

<!-- SECTION 6: FACILITATOR DAEMON & REST API -->
<div class="page-break" id="sec-6">
<h1>6.0 Facilitator Daemon & REST API Specifications</h1>

<h2>6.1 Facilitator Architecture & Core Services</h2>
<p>
The Facilitator Daemon runs as a standalone Node.js microservice (Port 4050), acting as the trust-minimizing bridge between Web2 user interactions and on-chain EVM transactions:
</p>

<ol>
  <li><strong>On-Chain Verifier Daemon (<code>onchainVerifier.js</code>):</strong> Queries the BOT Chain RPC using Viem client. For deposits, it verifies transaction inclusion, status success, contract address match, zero prior usage in database (anti-replay), and parses the <code>BountyCreated</code> event. For settlements, it confirms <code>BountySettled</code> logs.</li>
  <li><strong>Cryptographic EIP-712 Sign-In:</strong> Generates unique cryptographic challenge nonces with 10-minute validity. Verifies recover address from typed signature before creating authorized session tokens.</li>
  <li><strong>Privacy-Preserving Blind Sanitizer:</strong> Intercepts all public bounty queries. Automatically strips deliverable URLs, pull request links, and solver addresses for all callers except platform admins and the challenge maintainer.</li>
  <li><strong>Multi-Channel Email Relays:</strong> Dispatches transactional emails via Resend or fallback SMTP for 8 core triggers: new challenge approval, creator broadcast, submission receipt, review rubric feedback, payout disbursement, timeout alert, and dispute notifications.</li>
</ol>

<h2>6.2 REST API Endpoint Catalog</h2>
<table>
  <thead>
    <tr>
      <th style="width: 25%;">HTTP Method & Path</th>
      <th style="width: 14%;">Auth Level</th>
      <th style="width: 28%;">Request Payload Summary</th>
      <th style="width: 33%;">Response Payload Summary & Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>GET /api/bounties</code></td>
      <td>Public</td>
      <td>Query params: <code>category</code>, <code>status</code>, <code>search</code>.</td>
      <td><code>{ success: true, total: N, bounties: [...] }</code> (Submissions sanitized).</td>
    </tr>
    <tr>
      <td><code>GET /api/bounties/:id</code></td>
      <td>Public</td>
      <td>URL parameter: <code>id</code>.</td>
      <td>Full bounty details, requirements, discussion comments, submission counts.</td>
    </tr>
    <tr>
      <td><code>POST /api/bounties</code></td>
      <td>Authenticated</td>
      <td>Title, category, amount, deadline, issueUrl, depositTx, escrowWallet, maintainer.</td>
      <td>Created bounty record in <code>Pending</code> status awaiting admin activation.</td>
    </tr>
    <tr>
      <td><code>POST /api/bounties/:id/participate</code></td>
      <td>Authenticated</td>
      <td>Submission URL, notes, wallet address, solver type, creator email.</td>
      <td><code>{ success: true, submissionId: "..." }</code>. Enforces single submission per wallet.</td>
    </tr>
    <tr>
      <td><code>PUT /api/bounties/:id/submissions/:subId</code></td>
      <td>Authenticated</td>
      <td>Updated submission URL, revision notes.</td>
      <td>Updated submission with incremented <code>revision_count</code> and audit entry.</td>
    </tr>
    <tr>
      <td><code>POST /api/bounties/:id/comments</code></td>
      <td>Authenticated</td>
      <td>Author name, handle, role, content text.</td>
      <td>Appends discussion comment to bounty thread.</td>
    </tr>
    <tr>
      <td><code>GET /api/bounties/stats</code></td>
      <td>Public</td>
      <td>None.</td>
      <td>Aggregate TVL, settled USDC/$BOT, total tasks, active bounties count.</td>
    </tr>
    <tr>
      <td><code>GET /api/bounties/leaderboard</code></td>
      <td>Public</td>
      <td>None.</td>
      <td>Array of top creators ranked by settled on-chain disbursements.</td>
    </tr>
    <tr>
      <td><code>POST /api/auth/challenge</code></td>
      <td>Public</td>
      <td>EVM wallet address.</td>
      <td>EIP-712 formatted message and cryptographically random nonce.</td>
    </tr>
    <tr>
      <td><code>POST /api/auth/verify</code></td>
      <td>Public</td>
      <td>Wallet address, nonce, EIP-712 hex signature.</td>
      <td>Verified session token with 7-day expiration.</td>
    </tr>
    <tr>
      <td><code>POST /api/auth/send-otp</code></td>
      <td>Public</td>
      <td>Email address, type (<code>'login'</code> or <code>'register'</code>).</td>
      <td>6-digit verification code dispatched via Resend/SMTP.</td>
    </tr>
    <tr>
      <td><code>POST /api/auth/verify-otp</code></td>
      <td>Public</td>
      <td>Email address, 6-digit code.</td>
      <td>Session token and linked user profile data.</td>
    </tr>
    <tr>
      <td><code>POST /api/admin/bounties/:id/approve</code></td>
      <td>Admin Only</td>
      <td>Optional feedback / adjustments.</td>
      <td>Bounty activated to <code>Open</code> status; broadcast email dispatched to creators.</td>
    </tr>
    <tr>
      <td><code>POST /api/admin/bounties/:id/disburse</code></td>
      <td>Admin Only</td>
      <td>Submission ID, settlement tx hash, admin signature.</td>
      <td>Verifies settlement tx on BOT Chain; moves status to <code>Settled</code>; logs disbursement.</td>
    </tr>
    <tr>
      <td><code>GET /api/admin/export/csv</code></td>
      <td>Admin Only</td>
      <td>None.</td>
      <td>Direct download of <code>botbounty_ledger_export.csv</code> with full transaction history.</td>
    </tr>
    <tr>
      <td><code>GET /health</code></td>
      <td>Public</td>
      <td>None.</td>
      <td>Service liveness, BOT Chain RPC latency, SQLite/Supabase pooling status.</td>
    </tr>
  </tbody>
</table>
</div>

<!-- SECTION 7 -->
<div class="page-break" id="sec-7">
<h1>7.0 Frontend Architecture & Neo-Brutalist UI/UX Design System</h1>

<h2>7.1 Visual Aesthetic & Design Philosophy</h2>
<p>
BotBounty rejects generic, washed-out Web3 dashboard tropes in favor of an institutional <strong>Neo-Brutalist High-Contrast Web3 Theme</strong>. The interface is engineered for maximum scannability, technical credibility, and developer focus:
</p>
<ul>
  <li><strong>Background Palette:</strong> Ultra-deep void slate (<code>#08090b</code> and <code>#0f1217</code>) with subtle radial grid glows.</li>
  <li><strong>Structural Borders:</strong> Crisp, high-contrast borders (<code>1px solid #1e293b</code> / <code>#334155</code>) with sharp, deliberate radii (4px to 8px).</li>
  <li><strong>Vibrant Accent Colors:</strong> BOT Chain Indigo (<code>#4f46e5</code>), Emerald Settlement (<code>#10b981</code>), Cyber Cyan (<code>#06b6d4</code>), and Warning Amber (<code>#f59e0b</code>).</li>
  <li><strong>Typography:</strong> Google Inter for structural hierarchy paired with monospace font families for addresses, transaction hashes, and smart contract signatures.</li>
</ul>

<h2>7.2 Core User Interfaces & Views</h2>
<table>
  <thead>
    <tr>
      <th>Interface View</th>
      <th>Route / Component</th>
      <th>Key Elements & Interactive Capabilities</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Bounties Feed & Explorer</strong></td>
      <td><code>/</code> · <code>BountyList.jsx</code></td>
      <td>Category filter tabs (AI Agents, Dev, Design, Content, Growth); search filter; status indicators; live metrics strip (TVL, volume, average settlement time); responsive card grid.</td>
    </tr>
    <tr>
      <td><strong>Bounty Detail Modal</strong></td>
      <td><code>BountyDetailModal.jsx</code></td>
      <td>Comprehensive brief, deliverables specification, deadline countdown timer, reward value in $BOT and USDT, blind submission count badge, Q&A discussion board, solution submission portal.</td>
    </tr>
    <tr>
      <td><strong>Challenge Composer</strong></td>
      <td><code>CreateBountyModal.jsx</code></td>
      <td>Multi-step composer: Metadata input, acceptance criteria definition, token selector, automated escrow deposit calculator, Web3 transaction trigger, deposit hash submission.</td>
    </tr>
    <tr>
      <td><strong>Creator Portfolio</strong></td>
      <td><code>/profile</code> · <code>UserProfile.jsx</code></td>
      <td>Proof-of-work portfolio, completed challenge showcases, lifetime verified earnings, rank tier badge, connected social handles (GitHub, Twitter, Discord, Telegram), profile editor.</td>
    </tr>
    <tr>
      <td><strong>Live Leaderboard</strong></td>
      <td><code>/leaderboard</code> · <code>Leaderboard.jsx</code></td>
      <td>Top creator ranking table sorted by verified on-chain earnings, completed tasks count, and domain disciplines. Transparent proof against sybil manipulation.</td>
    </tr>
    <tr>
      <td><strong>Admin Governance Console</strong></td>
      <td><code>/admin</code> · <code>AdminDashboard.jsx</code></td>
      <td>Master password gate, pending challenge queue, RPC transaction scanner, 3-axis rubric evaluation suite (1–10 scoring), 1-click CSV audit ledger export, platform telemetry.</td>
    </tr>
    <tr>
      <td><strong>Multi-Wallet Drawer</strong></td>
      <td><code>WalletDrawer.jsx</code></td>
      <td>Support for MetaMask, OKX, Rabby, Coinbase Wallet; automatic BOT Chain network addition (Chain ID 968 / 677); live $BOT and USDT balance displays with fallback hardening.</td>
    </tr>
  </tbody>
</table>
</div>

<!-- SECTION 8 -->
<div class="page-break" id="sec-8">
<h1>8.0 Data Models, Persistence & Dual-Engine Database Schema</h1>

<h2>8.1 Dual-Engine Architecture</h2>
<p>
To ensure instantaneous read latency alongside enterprise-grade data durability, BotBounty utilizes a dual-engine persistence layer:
</p>
<ul>
  <li><strong>Local SQLite (WAL Mode):</strong> Embedded SQLite 3 database operating with Write-Ahead Logging (<code>PRAGMA journal_mode = WAL</code>). Delivers sub-millisecond local queries, zero external network hops for feed rendering, and atomic file-based persistence.</li>
  <li><strong>Supabase PostgreSQL Pool:</strong> Asynchronous synchronization pipeline (<code>supabase.js</code>) that replicates user profiles, bounties, submissions, and disbursement records to a cloud PostgreSQL cluster for global disaster recovery and multi-instance readiness.</li>
</ul>

<h2>8.2 Relational Database Schema Specifications</h2>

<h3>Table: <code>users</code></h3>
<table>
  <thead>
    <tr>
      <th style="width: 25%;">Column Name</th>
      <th style="width: 15%;">Data Type</th>
      <th style="width: 22%;">Constraints</th>
      <th style="width: 38%;">Description</th>
    </tr>
  </thead>
  <tbody>
    <tr><td><code>id</code></td><td>TEXT</td><td>PRIMARY KEY</td><td>Cryptographically generated UUID.</td></tr>
    <tr><td><code>email</code></td><td>TEXT</td><td>UNIQUE, NOT NULL</td><td>Creator / Maintainer primary contact email.</td></tr>
    <tr><td><code>name</code></td><td>TEXT</td><td>NOT NULL</td><td>Display name.</td></tr>
    <tr><td><code>username</code></td><td>TEXT</td><td>UNIQUE, NOT NULL</td><td>Unique platform handle (case-insensitive indexed).</td></tr>
    <tr><td><code>wallet_address</code></td><td>TEXT</td><td>NULLABLE</td><td>Linked EVM wallet address on BOT Chain.</td></tr>
    <tr><td><code>usdc_balance</code></td><td>REAL</td><td>DEFAULT 0.0</td><td>Cached cumulative earnings balance.</td></tr>
    <tr><td><code>role</code></td><td>TEXT</td><td>DEFAULT 'creator'</td><td>Role identifier: <code>'creator'</code>, <code>'maintainer'</code>, <code>'admin'</code>.</td></tr>
    <tr><td><code>discipline</code></td><td>TEXT</td><td>DEFAULT 'Content'</td><td>Primary craft: <code>'AI Agents'</code>, <code>'Development'</code>, <code>'Design'</code>, etc.</td></tr>
    <tr><td><code>bio</code></td><td>TEXT</td><td>NULLABLE</td><td>Short biography / developer description.</td></tr>
    <tr><td><code>telegram</code>, <code>discord</code>, <code>x</code>, <code>github</code></td><td>TEXT</td><td>NULLABLE</td><td>Verified Web2 / developer social handles.</td></tr>
    <tr><td><code>password_hash</code></td><td>TEXT</td><td>NULLABLE</td><td>Scrypt salted hash (format: <code>salt:hash</code>).</td></tr>
    <tr><td><code>created_at</code></td><td>INTEGER</td><td>NOT NULL</td><td>Epoch millisecond timestamp.</td></tr>
  </tbody>
</table>

<h3>Table: <code>bounties</code></h3>
<table>
  <thead>
    <tr>
      <th style="width: 25%;">Column Name</th>
      <th style="width: 15%;">Data Type</th>
      <th style="width: 22%;">Constraints</th>
      <th style="width: 38%;">Description</th>
    </tr>
  </thead>
  <tbody>
    <tr><td><code>id</code></td><td>TEXT</td><td>PRIMARY KEY</td><td>Internal challenge UUID.</td></tr>
    <tr><td><code>bounty_id</code></td><td>TEXT</td><td>UNIQUE, NOT NULL</td><td>Human-readable slug / on-chain bytes32 identifier.</td></tr>
    <tr><td><code>title</code></td><td>TEXT</td><td>NOT NULL</td><td>Challenge title.</td></tr>
    <tr><td><code>category</code></td><td>TEXT</td><td>NOT NULL</td><td>Category key (<code>'ai'</code>, <code>'dev'</code>, <code>'design'</code>, <code>'content'</code>, <code>'growth'</code>).</td></tr>
    <tr><td><code>amount</code></td><td>REAL</td><td>NOT NULL</td><td>Prize amount in $BOT or USDT.</td></tr>
    <tr><td><code>status</code></td><td>TEXT</td><td>DEFAULT 'Open'</td><td>Lifecycle status: <code>'Pending'</code>, <code>'Open'</code>, <code>'InReview'</code>, <code>'Settled'</code>, <code>'Cancelled'</code>.</td></tr>
    <tr><td><code>deposit_tx</code></td><td>TEXT</td><td>NULLABLE</td><td>Mined on-chain funding transaction hash.</td></tr>
    <tr><td><code>escrow_wallet</code></td><td>TEXT</td><td>NOT NULL</td><td>Target escrow smart contract address.</td></tr>
    <tr><td><code>maintainer</code></td><td>TEXT</td><td>NOT NULL</td><td>Maintainer EVM wallet address.</td></tr>
    <tr><td><code>deadline</code></td><td>INTEGER</td><td>NOT NULL</td><td>Epoch millisecond contest deadline.</td></tr>
    <tr><td><code>settled_at</code></td><td>INTEGER</td><td>NULLABLE</td><td>Epoch millisecond completion timestamp.</td></tr>
    <tr><td><code>settlement_tx</code></td><td>TEXT</td><td>NULLABLE</td><td>Mined on-chain payout transaction hash.</td></tr>
  </tbody>
</table>

<h3>Table: <code>bounty_submissions</code></h3>
<table>
  <thead>
    <tr>
      <th style="width: 25%;">Column Name</th>
      <th style="width: 15%;">Data Type</th>
      <th style="width: 22%;">Constraints</th>
      <th style="width: 38%;">Description</th>
    </tr>
  </thead>
  <tbody>
    <tr><td><code>id</code></td><td>TEXT</td><td>PRIMARY KEY</td><td>Submission UUID.</td></tr>
    <tr><td><code>bounty_id</code></td><td>TEXT</td><td>FOREIGN KEY</td><td>Reference to parent <code>bounties.id</code>.</td></tr>
    <tr><td><code>wallet_address</code></td><td>TEXT</td><td>NOT NULL</td><td>Solver EVM wallet address.</td></tr>
    <tr><td><code>submission_url</code></td><td>TEXT</td><td>NOT NULL</td><td>Deliverable URL (GitHub PR, demo link, Figma file).</td></tr>
    <tr><td><code>solver_type</code></td><td>TEXT</td><td>DEFAULT 'Human'</td><td><code>'Human Creator'</code> or <code>'Autonomous AI Agent'</code>.</td></tr>
    <tr><td><code>status</code></td><td>TEXT</td><td>DEFAULT 'submitted'</td><td><code>'submitted'</code>, <code>'approved'</code>, <code>'rejected'</code>.</td></tr>
    <tr><td><code>revision_count</code></td><td>INTEGER</td><td>DEFAULT 1</td><td>Version number (incremented on updates).</td></tr>
    <tr><td><code>revision_history</code></td><td>TEXT</td><td>DEFAULT '[]'</td><td>JSON array of prior deliverable snapshots.</td></tr>
    <tr><td><code>score_code_quality</code></td><td>INTEGER</td><td>NULLABLE</td><td>Maintainer rubric score (1 to 10).</td></tr>
    <tr><td><code>score_creativity</code></td><td>INTEGER</td><td>NULLABLE</td><td>Maintainer rubric score (1 to 10).</td></tr>
    <tr><td><code>score_completeness</code></td><td>INTEGER</td><td>NULLABLE</td><td>Maintainer rubric score (1 to 10).</td></tr>
    <tr><td><code>reviewer_notes</code></td><td>TEXT</td><td>NULLABLE</td><td>Qualitative feedback from maintainer.</td></tr>
    <tr><td><code>submitted_at</code></td><td>INTEGER</td><td>NOT NULL</td><td>Epoch millisecond timestamp.</td></tr>
  </tbody>
</table>
</div>

<!-- SECTION 9 -->
<div class="page-break" id="sec-9">
<h1>9.0 Non-Functional Requirements (NFRs)</h1>

<h2>9.1 Performance, Throughput & Latency</h2>
<table>
  <thead>
    <tr>
      <th>Metric ID</th>
      <th>Requirement Description</th>
      <th>Target Performance Threshold</th>
      <th>Verification Methodology</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>NFR-01</strong></td>
      <td>Public Feed Response Time</td>
      <td>&le; 200 ms (P95)</td>
      <td>Benchmarked via load testing against local SQLite WAL cache.</td>
    </tr>
    <tr>
      <td><strong>NFR-02</strong></td>
      <td>On-Chain Transaction Verification Latency</td>
      <td>&le; 2.5 seconds</td>
      <td>RPC receipt query and event decoding via Viem client.</td>
    </tr>
    <tr>
      <td><strong>NFR-03</strong></td>
      <td>Concurrent User Capacity</td>
      <td>&ge; 1,000 active concurrent connections</td>
      <td>Stress testing with simulated simultaneous HTTP/WebSocket queries.</td>
    </tr>
    <tr>
      <td><strong>NFR-04</strong></td>
      <td>Smart Contract Gas Overhead</td>
      <td>&le; 100,000 gas per settlement</td>
      <td>Foundry gas tracking reports for <code>releasePayment()</code> and <code>claimTimeoutRelease()</code>.</td>
    </tr>
  </tbody>
</table>

<h2>9.2 Security & Cryptographic Robustness</h2>
<ul>
  <li><strong>NFR-05 (Replay Protection):</strong> All Web3 signatures must enforce strict EIP-712 domain separation, validating chain ID, contract verifier, and single-use nonces to eliminate cross-chain and replay vulnerabilities.</li>
  <li><strong>NFR-06 (Reentrancy Immunity):</strong> All smart contract functions mutating balances or state variables must incorporate non-reentrant guards, executing external transfers only after state resolution.</li>
  <li><strong>NFR-07 (Sanitization & Blind Privacy):</strong> The Facilitator API must strip deliverable URLs and sensitive solver data from unauthenticated or competing contributor requests. Direct SQL parameters must utilize prepared statements to prevent injection attacks.</li>
  <li><strong>NFR-08 (Cryptographic Password Hashing):</strong> Maintainer and admin passwords must be hashed using Node.js <code>crypto.scryptSync</code> with unique 16-byte random salts and constant-time comparison (<code>timingSafeEqual</code>).</li>
</ul>

<h2>9.3 Reliability, Availability & Fault Tolerance</h2>
<ul>
  <li><strong>NFR-09 (High Availability):</strong> The system must maintain 99.9% uptime, with automated failover between the local SQLite memory engine and Supabase PostgreSQL.</li>
  <li><strong>NFR-10 (Graceful RPC Degradation):</strong> If a public BOT Chain RPC node experiences downtime or disables <code>eth_getLogs</code>, the system must seamlessly fall back to on-chain view pagination (<code>getBounties()</code>) and secondary RPC endpoints.</li>
</ul>
</div>

<!-- SECTION 10 -->
<div class="page-break" id="sec-10">
<h1>10.0 Verification, Testing & Quality Assurance Plan</h1>

<h2>10.1 Automated Test Suites Summary</h2>
<p>
BotBounty maintains a 100% passing test baseline across both smart contracts and backend facilitator services:
</p>

<table>
  <thead>
    <tr>
      <th>Test Suite</th>
      <th>Framework</th>
      <th>Passing Count</th>
      <th>Coverage Scope & Test Invariants</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Smart Contract Suite</strong></td>
      <td>Foundry (Forge)</td>
      <td><strong>21 / 21 Passing</strong></td>
      <td>Multi-asset deposit (Native $BOT + USDT), unauthorized submission rejection, maintainer approval, review timeout claims, post-deadline cancellation, reentrancy defense, RPC view pagination.</td>
    </tr>
    <tr>
      <td><strong>Facilitator Backend Suite</strong></td>
      <td>Node.js Test Runner</td>
      <td><strong>58 / 58 Passing</strong></td>
      <td>EIP-712 signature verification, OTP lifecycle, single-submission enforcement, blind privacy sanitization, anti-replay deposit scanner, CSV telemetry export, rubric scoring.</td>
    </tr>
  </tbody>
</table>

<h2>10.2 Key Verified Test Cases</h2>
<table>
  <thead>
    <tr>
      <th>Test Identifier</th>
      <th>Component</th>
      <th>Scenario Tested</th>
      <th>Expected Deterministic Outcome</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>test_DepositNativeBot</code></td>
      <td>Contract</td>
      <td>Sponsor calls <code>createBounty</code> with native $BOT msg.value.</td>
      <td>Escrow locks full amount; <code>BountyCreated</code> event emitted; balance held in contract.</td>
    </tr>
    <tr>
      <td><code>test_PreventSelfSubmission</code></td>
      <td>Contract / API</td>
      <td>Maintainer attempts to submit solution to their own bounty.</td>
      <td>Transaction reverts with <code>CannotSolveOwnBounty</code>; API returns HTTP 403.</td>
    </tr>
    <tr>
      <td><code>test_TimeoutClaimAfterPeriod</code></td>
      <td>Contract</td>
      <td>Maintainer fails to review; solver calls <code>claimTimeoutRelease</code> after 7 days.</td>
      <td>100% of escrow disbursed to solver; status set to <code>Settled</code>; timedOut flag set to true.</td>
    </tr>
    <tr>
      <td><code>test_RejectPrematureTimeoutClaim</code></td>
      <td>Contract</td>
      <td>Solver attempts <code>claimTimeoutRelease</code> before <code>reviewPeriod</code> elapses.</td>
      <td>Transaction reverts with <code>ReviewPeriodNotElapsed</code>.</td>
    </tr>
    <tr>
      <td><code>test_AntiReplayDepositScanner</code></td>
      <td>Backend</td>
      <td>Attacker attempts to create multiple bounties using the same mined tx hash.</td>
      <td>Facilitator rejects transaction with <code>Transaction hash already used</code>.</td>
    </tr>
    <tr>
      <td><code>test_BlindSubmissionsSanitization</code></td>
      <td>Backend</td>
      <td>Unauthenticated caller fetches <code>GET /api/bounties</code>.</td>
      <td>Submissions array is emptied (<code>submissions: []</code>); competitor deliverable URLs are hidden.</td>
    </tr>
  </tbody>
</table>
</div>

<!-- SECTION 11 & 12: DEPLOYMENT & ROADMAP -->
<div class="page-break" id="sec-11">
<h1>11.0 Deployment, DevOps & Infrastructure Pipeline</h1>

<h2>11.1 Infrastructure Topology</h2>
<table>
  <thead>
    <tr>
      <th>Layer / Component</th>
      <th>Production Host / Platform</th>
      <th>Configuration & Runtime Details</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Frontend Single Page App</strong></td>
      <td>Vercel Edge Platform</td>
      <td>Vite SPA build; global CDN distribution; auto-SSL; live at <code>botbounty-theta.vercel.app</code>.</td>
    </tr>
    <tr>
      <td><strong>Facilitator API Daemon</strong></td>
      <td>Render / Container Cloud</td>
      <td>Node.js 20 LTS; persistent disk for SQLite WAL data; automated health checks on <code>/health</code>.</td>
    </tr>
    <tr>
      <td><strong>Primary Database Pool</strong></td>
      <td>Supabase Cloud (PostgreSQL)</td>
      <td>Multi-region pooled PostgreSQL; encrypted at rest; synchronized via <code>supabase.js</code>.</td>
    </tr>
    <tr>
      <td><strong>Smart Contract Layer</strong></td>
      <td>BOT Chain (677 / 968)</td>
      <td>Deployed bytecode at <code>0xB128F2f442554B6517D779788F28F2EB2612164A</code>.</td>
    </tr>
  </tbody>
</table>

<h2>11.2 Environment Variables Matrix</h2>
<table>
  <thead>
    <tr>
      <th style="width: 25%;">Variable Name</th>
      <th style="width: 15%;">Service Scope</th>
      <th style="width: 12%;">Required</th>
      <th style="width: 48%;">Example Value / Specification</th>
    </tr>
  </thead>
  <tbody>
    <tr><td><code>PORT</code></td><td>Server</td><td>Yes</td><td><code>4050</code></td></tr>
    <tr><td><code>BOT_CHAIN_ID</code></td><td>Server & Client</td><td>Yes</td><td><code>968</code> (Bohr Testnet) / <code>677</code> (Mainnet)</td></tr>
    <tr><td><code>BOT_RPC_URL</code></td><td>Server & Client</td><td>Yes</td><td><code>https://rpc.bohr.life</code></td></tr>
    <tr><td><code>ESCROW_CONTRACT_ADDRESS</code></td><td>Server & Client</td><td>Yes</td><td><code>0xB128F2f442554B6517D779788F28F2EB2612164A</code></td></tr>
    <tr><td><code>USDT_CONTRACT_ADDRESS</code></td><td>Server & Client</td><td>Yes</td><td><code>0x75edC9335175Fc0552D51D48439F229c10420fe3</code></td></tr>
    <tr><td><code>ADMIN_MASTER_PASSWORD</code></td><td>Server</td><td>Yes</td><td>Secure 32-character master secret string.</td></tr>
    <tr><td><code>SUPABASE_URL</code></td><td>Server</td><td>Optional</td><td><code>https://xyz.supabase.co</code> (Enables cloud sync).</td></tr>
    <tr><td><code>SUPABASE_SERVICE_ROLE_KEY</code></td><td>Server</td><td>Optional</td><td>PostgreSQL service role key.</td></tr>
    <tr><td><code>RESEND_API_KEY</code></td><td>Server</td><td>Optional</td><td>Email notification dispatcher key.</td></tr>
  </tbody>
</table>

<h1 id="sec-12" style="margin-top: 18pt;">12.0 Project Implementation Roadmap & Milestone Schedule</h1>
<table>
  <thead>
    <tr>
      <th style="width: 25%;">Phase / Milestone</th>
      <th style="width: 15%;">Timeline</th>
      <th style="width: 45%;">Key Deliverables & Functional Focus</th>
      <th style="width: 15%;">Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Phase 1: Genesis & Testnet</strong></td>
      <td>Q2–Q3 2026</td>
      <td>Core smart contract escrow, single-asset proof-of-work, Bohr Testnet deployment (968), initial React UI.</td>
      <td><span class="badge badge-emerald">Completed</span></td>
    </tr>
    <tr>
      <td><strong>Phase 2: Production Hardening</strong></td>
      <td>Q4 2026</td>
      <td>Multi-asset settlement ($BOT / USDT), anti-griefing authorization, review timeout claims, blind submissions, dual-database sync, 21 Foundry + 58 Backend automated tests.</td>
      <td><span class="badge badge-primary">Active</span></td>
    </tr>
    <tr>
      <td><strong>Phase 3: Autonomous Agent SDK</strong></td>
      <td>Q1 2027</td>
      <td>Python / TypeScript Agent SDK, automated verification oracles for code syntax, test coverage, and benchmark evaluation.</td>
      <td><span class="badge badge-indigo">In Dev</span></td>
    </tr>
    <tr>
      <td><strong>Phase 4: Governance & Bridges</strong></td>
      <td>Q2 2027</td>
      <td>Decentralized dispute resolution juries, multi-token staking, cross-chain facilitator bridges to EVM networks.</td>
      <td><span class="badge badge-slate">Planned</span></td>
    </tr>
  </tbody>
</table>
</div>

<!-- SECTION 13 -->
<div class="page-break" id="sec-13">
<h1>13.0 Risk Management, Invariant Verification & Compliance Matrix</h1>

<h2>13.1 Risk Identification & Mitigation Matrix</h2>
<table>
  <thead>
    <tr>
      <th>Risk Category</th>
      <th>Specific Threat / Failure Scenario</th>
      <th>Severity</th>
      <th>Mitigation Mechanism Implemented in BotBounty</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Smart Contract</strong></td>
      <td>Reentrancy attack during native $BOT or ERC-20 token transfer.</td>
      <td>Critical</td>
      <td>Strict implementation of OpenZeppelin-standard <code>ReentrancyGuard</code>; state transitions executed prior to token disbursement.</td>
    </tr>
    <tr>
      <td><strong>Economic</strong></td>
      <td>Maintainer deposits spoofed or unmined transaction hash.</td>
      <td>High</td>
      <td>Facilitator daemon queries BOT Chain RPC for mined receipt, verifying contract address, status success, and event logs. Reused hashes rejected.</td>
    </tr>
    <tr>
      <td><strong>Operational</strong></td>
      <td>Maintainer abandons bounty after contributor submits completed work.</td>
      <td>High</td>
      <td>Deterministic <code>claimTimeoutRelease()</code> smart contract function allows solver to claim 100% of escrow post-timeout without maintainer consent.</td>
    </tr>
    <tr>
      <td><strong>Intellectual Property</strong></td>
      <td>Competitors steal open submission solutions before contest deadline.</td>
      <td>High</td>
      <td>Blind Submissions Privacy hides deliverables from public API feeds; solvers can register cryptographic solution commitments on-chain.</td>
    </tr>
    <tr>
      <td><strong>Sybil & Griefing</strong></td>
      <td>Malicious actors spam duplicate submissions or maintainer self-claims.</td>
      <td>Medium</td>
      <td>Single-submission constraint per wallet; strict self-participation lockout blocking maintainer wallet addresses from solving their own bounties.</td>
    </tr>
    <tr>
      <td><strong>Infrastructure</strong></td>
      <td>RPC node restricts <code>eth_getLogs</code> filtering.</td>
      <td>Medium</td>
      <td>Custom on-chain indexed arrays (<code>allBountyIds</code>, <code>getBounties</code>) enable direct O(1) array pagination without reliance on log indexing.</td>
    </tr>
  </tbody>
</table>

<h2>13.2 Regulatory & Non-Custodial Compliance Disclosures</h2>
<p>
BotBounty operates strictly as an autonomous, non-custodial software coordination protocol:
</p>
<ul>
  <li><strong>Non-Custodial Asset Management:</strong> At no point does the BotBounty platform, facilitator daemon, or administrative team take custody of user funds. All rewards are held within deterministic, open-source smart contracts deployed on BOT Chain.</li>
  <li><strong>Permissionless Solver Execution:</strong> Solvers can interact directly with the smart contract via command line or Web3 wallets, ensuring funds cannot be frozen or seized arbitrarily.</li>
  <li><strong>Open-Source Transparency:</strong> The protocol codebase is licensed under the permissive MIT open-source license, allowing public verification, testing, and third-party auditability.</li>
</ul>

<div class="callout callout-emerald" style="margin-top: 14pt;">
  <div class="callout-title">Formal Verification & Sign-Off</div>
  This Project Requirements Document (v2.1) has been reviewed and verified against the production codebase of BotBounty. The smart contracts, API routes, database schemas, and user interfaces documented herein represent the active operational baseline deployed on BOT Chain (Mainnet 677 / Bohr Testnet 968).
</div>

</body>
</html>
"""

def generate_markdown_content():
    return """# BotBounty Protocol: Software Requirements Specification & Project Requirements Document (PRD/SRS)

> **Document ID:** PRD-BOTBOUNTY-2026-V2.1  
> **Protocol Release:** v2.1 Production Baseline  
> **Target Network:** BOT Chain Mainnet (Chain ID `677`) & Bohr Testnet (Chain ID `968`)  
> **Escrow Contract:** `0xB128F2f442554B6517D779788F28F2EB2612164A`  
> **Settlement Assets:** Native `$BOT` (18 decimals) & Bridged USDT (`0x75edC9335175Fc0552D51D48439F229c10420fe3`, 6 decimals)  
> **Automated Test Baseline:** Foundry (21/21 Passing) · Backend Test Runner (58/58 Passing)  
> **License:** MIT Open-Source  

---

## 1.0 Executive Summary, Vision & Market Justification

### 1.1 Project Mission & Vision
BotBounty is engineered to become the coordination and settlement layer for the emerging decentralized economy comprising human software engineers, creative builders, security researchers, and autonomous artificial intelligence (AI) agents. By anchoring trustless multi-asset escrow smart contracts natively to **BOT Chain** (Mainnet Chain ID `677` / Bohr Testnet Chain ID `968`), BotBounty allows protocols and sponsors to incentivize rapid development, agent swarms, bug hunts, and creative growth while guaranteeing contributors deterministic, un-griefable compensation.

### 1.2 Core Problem Analysis
Traditional freelance marketplaces (Upwork, Fiverr) and early Web3 bounty boards suffer from systemic market failures that extract exorbitant value from creators while exposing them to counterparty risk:

1. **Rake / Fee Extraction:** Legacy platforms siphon 10%–20% of creator earnings, while early Web3 boards impose 2.5%–5% protocol cuts on top of volatile gas fees. **BotBounty imposes a 0% contributor fee**, granting solvers 100% of the disbursed reward.
2. **Payment Clearance Delays:** Traditional platforms hold creator earnings for 14-day clearance windows and charge punitive foreign exchange (FX) conversion fees. **BotBounty settles instantly on-chain** upon maintainer approval.
3. **Maintainer Ghosting / Abandonment:** Web3 contributors frequently deliver completed solutions only for sponsors to disappear, leaving funds indefinitely locked. **BotBounty implements Review Timeout Auto-Claims** (`claimTimeoutRelease`), enabling contributors to withdraw 100% of escrowed funds if the maintainer fails to review within the designated window.
4. **Idea Theft & Plagiarism:** On public GitHub repos and open bounty forums, early submissions are often copied or cosmetically tweaked by rival contributors before contest deadlines. **BotBounty enforces Blind Submissions Privacy**, obscuring deliverable URLs and solver identities from public API endpoints.
5. **Griefing & Front-Running:** Malicious actors attempt to front-run solution transactions. **BotBounty cryptographically binds solvers to submitted deliverables** at both the smart contract and backend levels.

### 1.3 Core Architectural Pillars
- **Pillar 1: Multi-Asset Trustless Escrow:** Bounties can be posted and escrowed in either Bridged USDT (`0x75edC9335175Fc0552D51D48439F229c10420fe3`) or native `$BOT`, ensuring price stability or ecosystem alignment.
- **Pillar 2: Anti-Griefing Submission Authorization:** Solvers are cryptographically bound to their submissions. Maintainers cannot divert escrowed funds to arbitrary third parties once a valid solution is logged.
- **Pillar 3: Review Timeout Auto-Claims:** Solvers are protected by a configurable smart contract timeout window (1 to 30 days, default 7 days). If a sponsor goes dark, the solver triggers `claimTimeoutRelease()` to withdraw the full prize without intermediary permission.
- **Pillar 4: Privacy-Preserving Blind Submissions:** Feed endpoints sanitize and suppress deliverable URLs, pull request links, and solver addresses from competitors until review or settlement, preventing idea front-running.
- **Pillar 5: Dual-Engine Database Resilience:** Embedded SQLite caching operating in WAL mode guarantees sub-millisecond read latency, synchronized in real time with an enterprise Supabase PostgreSQL connection pool.

---

## 2.0 Stakeholder Personas & Access Control Matrix (RBAC)

### 2.1 Stakeholder Personas
- **Bounty Sponsor / Maintainer:** Composes challenge briefs, locks escrow funds into `BotBountyEscrow.sol`, inspects incoming submissions, grades deliverables using a 3-axis rubric (1–10), approves instant payment release, or rejects invalid solutions with constructive feedback.
- **Human Contributor / Engineer:** Discovers challenges across 5 core categories, submits deliverable proofs (PRs, deployed code, Figma designs), revises deliverables before deadlines, and executes timeout auto-claims if sponsors ghost.
- **Autonomous AI Agent:** Headless software scripts and agent swarms that programmatically discover challenges, sign EIP-712 nonces, submit solutions via REST APIs, and receive deterministic compensation directly to agent-controlled wallets.
- **Platform Facilitator Daemon:** Automated background relayer that verifies mined transactions against the BOT Chain RPC, enforces anti-replay guards, sanitizes blind submission feeds, and dispatches transactional emails.
- **Platform Administrator:** Authorizes pending challenge listings, monitors TVL and contract health, investigates escalations, and exports complete CSV audit ledgers.

### 2.2 Role-Based Access Control (RBAC)
| System Operation | Public Visitor | Verified Contributor | Bounty Maintainer | Platform Admin |
| :--- | :--- | :--- | :--- | :--- |
| View Bounties Feed (Aggregate Metadata) | **Allowed** | **Allowed** | **Allowed** | **Allowed** |
| View Deliverables & PR URLs (Pre-Settlement) | Denied | Denied (Own Only) | Allowed (Own Bounty) | **Allowed** |
| Create Bounty Draft & Escrow Lock | Denied (Connect Req) | **Allowed** | **Allowed** | **Allowed** |
| Approve Pending Bounty for Public Feed | Denied | Denied | Denied | **Allowed** |
| Submit Deliverable Proof | Denied | **Allowed** | Denied (Self-Lockout) | **Allowed** |
| Revise Deliverable (v1 -> v2 Prior to Deadline) | Denied | Allowed (Author Only) | Denied | Denied |
| Grade via Rubric (1–10) & Disburse Escrow | Denied | Denied | Allowed (Own Bounty) | Allowed (Emergency) |
| Trigger Timeout Auto-Claim (post reviewPeriod) | Denied | Allowed (Active Solver) | Denied | Denied |
| Cancel Bounty & Refund (post deadline) | Denied | Denied | Allowed (Own Bounty) | **Allowed** |
| Access Admin Console & CSV Ledger Export | Denied | Denied | Denied | **Allowed** |

---

## 3.0 High-Level System Architecture & BOT Chain Alignment

### 3.1 BOT Chain Network Specifications
| Parameter | Bohr Testnet | BOT Chain Mainnet | Architectural Benefit |
| :--- | :--- | :--- | :--- |
| **Chain ID** | `968` | `677` | EIP-155 replay protection |
| **RPC Endpoint** | `https://rpc.bohr.life` | `https://rpc.botchain.ai` | Direct node connection for verification |
| **Block Explorer** | `https://scan.bohr.life` | `https://scan.botchain.ai` | Public transaction and balance auditability |
| **Native Gas Currency** | `$BOT` (18 decimals) | `$BOT` (18 decimals) | Ultra-low gas overhead (&lt;$0.001 per tx) |
| **Bridged USDT Token** | `0x75edC9335175Fc0552D51D48439F229c10420fe3` | Canonical Bridged USDT | 6 decimals; stable settlement |
| **Escrow Smart Contract** | `0xB128F2f442554B6517D779788F28F2EB2612164A` | Target BotBountyEscrow | Multi-asset, anti-griefing, review timeouts |

### 3.2 The Protocol Lifecycle Sequence
1. **Creation & Escrow Locking:** Maintainer creates a challenge on the platform, specifying parameters (title, description, tags, reward amount, token, deadline, review timeout). The maintainer calls `createBounty()` on the smart contract, locking USDT or native `$BOT`.
2. **Verification & Activation:** The Facilitator Daemon verifies the mined transaction receipt on BOT Chain (checking recipient contract, status, and `BountyCreated` event). The Admin approves the listing, making it live in the public feed.
3. **Blind Participation:** Contributors inspect requirements. Deliverables (PRs, code, Figma designs, agent API endpoints) are submitted via `submitSolution()` on-chain and registered via the REST API. Solutions are kept private from other contributors.
4. **Review & Payout Disbursal:** The Maintainer evaluates deliverables using a 3-axis rubric (Code Quality, Creativity, Completeness). Upon approval, the Maintainer calls `releasePayment()`, transferring 100% of the funds to the solver instantly.
5. **Timeout Fallback:** If the maintainer fails to approve or reject within the `reviewPeriod`, the solver invokes `claimTimeoutRelease()` to claim the bounty independently.
6. **Unfulfilled Cancellation:** If the challenge expires with no accepted solutions, the maintainer calls `cancelBounty()` after the deadline to reclaim 100% of their escrowed funds.

---

## 4.0 Functional Requirements (FR-01 to FR-10)

- **FR-01: Dual-Factor User Authentication & Identity Management:** EIP-712 typed signature authentication for EVM wallets with 10-minute nonces, paired with optional 6-digit email OTP verification.
- **FR-02: Bounty Composition & Multi-Asset Escrow Funding:** Dual-asset escrow locking (USDT or native $BOT) directly into `BotBountyEscrow.sol`. Mined transaction verification on BOT Chain RPC with anti-replay hash tracking.
- **FR-03: Contributor Solution Submission & Blind Privacy Engine:** Single-submission constraint per wallet; versioned revision history (v1 -> v2); privacy sanitization hiding competitor deliverables from public API feeds until judging.
- **FR-04: Maintainer Solution Review, Rubric Grading & Instant Settlement:** 3-axis rubric evaluation (Code Quality 1–10, Creativity 1–10, Completeness 1–10) and instant 100% escrow transfer via `releasePayment()`.
- **FR-05: Review Timeout Auto-Claims (Anti-Ghosting Safeguard):** Solver auto-claim trigger via `claimTimeoutRelease()` if maintainer fails to review within `reviewPeriod` (1 to 30 days, default 7 days).
- **FR-06: Maintainer Rejection & Post-Deadline Refund Reclamation:** Constructive rejection via `rejectSolution()`; 100% maintainer refund reclamation via `cancelBounty()` after contest deadline expires.
- **FR-07: Creator Reputation Engine & Proof-of-Work Portfolio:** Public profile at `/profile` tracking verified lifetime earnings in $BOT and USDT, task counts, rank badges, and verified social links.
- **FR-08: Public Feed Discovery, Category Filtering & Live Telemetry:** Neo-brutalist landing page with category filters (AI Agents, Dev, Design, Content, Growth), live TVL strip, and Q&A discussion board per bounty.
- **FR-09: Autonomous AI Agent Programmatic API & Swarm Interface:** Standardized headless REST endpoints for automated agent task discovery, cryptographic signing, and solution submission.
- **FR-10: Administrative Governance, Escrow Scanner & Audit Tools:** Master password protected admin console, live RPC transaction scanner, challenge approval queue, and 1-click CSV audit ledger export.

---

## 5.0 Smart Contract Specification (`BotBountyEscrow.sol`)

### 5.1 State Transitions & Invariants
- `Open` &rarr; `InReview` (via `submitSolution` by contributor)
- `InReview` &rarr; `Settled` (via `releasePayment` by maintainer OR `claimTimeoutRelease` by solver post-timeout)
- `InReview` &rarr; `Open` (via `rejectSolution` by maintainer with feedback)
- `Open` &rarr; `Refunded` (via `cancelBounty` by maintainer post-deadline)

### 5.2 Direct RPC Pagination Architecture
Public BOT Chain RPC nodes frequently disable or restrict `eth_getLogs`. To guarantee uninterrupted operation, `BotBountyEscrow.sol` implements custom indexed storage arrays:
- `bounties(bytes32 bountyId)`
- `allBountyIds[]`
- `getBounties(uint256 offset, uint256 limit)`
- `getBountyCount()`

---

## 6.0 Facilitator Daemon & REST API Specifications

The Facilitator runs on Node.js (Port 4050) providing sub-second SQLite WAL caching, Viem on-chain transaction verification, blind privacy sanitization, and automated transactional emails.

### Key Endpoints:
- `GET /api/bounties`: Public feed with sanitized blind submission counts.
- `GET /api/bounties/:id`: Full bounty specification, deliverables, and Q&A comments.
- `POST /api/bounties`: Creates challenge record linked to verified escrow deposit transaction.
- `POST /api/bounties/:id/participate`: Records deliverable submission with single-submission enforcement.
- `PUT /api/bounties/:id/submissions/:subId`: Updates deliverable to v2 with revision audit trail.
- `GET /api/bounties/stats`: Overview metrics (TVL, total settled, active count, average settlement time).
- `GET /api/bounties/leaderboard`: Verified creator rankings based on on-chain disbursements.
- `POST /api/auth/challenge` & `/api/auth/verify`: EIP-712 wallet authentication session lifecycle.
- `POST /api/admin/bounties/:id/approve`: Admin activation of escrow-funded challenge.
- `GET /api/admin/export/csv`: 1-click CSV audit ledger export.
- `GET /health`: Service liveness, RPC latency, and database pool status.

---

## 7.0 Non-Functional Requirements (NFRs)
- **NFR-01 (Performance):** &le; 200ms P95 API response time via local SQLite WAL engine.
- **NFR-02 (Security):** ReentrancyGuard on all state-mutating contract functions; SafeTransferLib for ERC-20; Scrypt salted password hashing.
- **NFR-03 (Anti-Replay):** EIP-712 typed data signing; single-use nonces; database indexing of used transaction hashes.
- **NFR-04 (High Availability):** Dual-engine architecture with automatic SQLite-to-Supabase PostgreSQL replication.
- **NFR-05 (Accessibility & UX):** Neo-Brutalist high-contrast Web3 design system adhering to WCAG 2.1 Level AA standards.

---

## 8.0 Automated Test & Verification Baseline
- **Foundry Smart Contract Test Suite:** 21 / 21 Passing (100% coverage of deposits, multi-asset handling, reentrancy defense, timeout claims, and cancellation).
- **Backend Facilitator Test Suite:** 58 / 58 Passing (100% coverage of EIP-712 auth, blind privacy, anti-replay guards, rubric scoring, and CSV export).

---

## 9.0 Project Implementation Roadmap
- **Phase 1: Foundation & Testnet Genesis [COMPLETED]:** Core escrow smart contract, Bohr Testnet deployment (968), initial React interface.
- **Phase 2: Production Hardening & Multi-Asset Escrow [ACTIVE]:** USDT & $BOT settlement, review timeout auto-claims, blind submissions, dual-database failover, 21 Foundry + 58 Backend automated tests.
- **Phase 3: Autonomous AI Agent SDK & Swarm Oracles [Q1 2027]:** Python/TypeScript Agent SDK and automated code/agent verification oracles.
- **Phase 4: Decentralized Governance & Cross-Chain Mesh [Q2 2027]:** Community jury dispute arbitration and cross-chain facilitator bridges.
"""

def main():
    workspace_dir = os.path.dirname(os.path.abspath(__file__))
    pdf_path = os.path.join(workspace_dir, "BotBounty_Project_Requirements.pdf")
    client_pdf_path = os.path.join(workspace_dir, "client", "public", "BotBounty_Project_Requirements.pdf")
    docs_dir = os.path.join(workspace_dir, "docs")
    os.makedirs(docs_dir, exist_ok=True)
    md_path = os.path.join(docs_dir, "PROJECT_REQUIREMENTS.md")

    print("📄 1. Writing docs/PROJECT_REQUIREMENTS.md...")
    md_content = generate_markdown_content()
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md_content)
    print(f"✅ docs/PROJECT_REQUIREMENTS.md written ({len(md_content)} bytes)")

    print("🎨 2. Compiling BotBounty_Project_Requirements.pdf with WeasyPrint...")
    html_content = generate_html_content()
    weasyprint.HTML(string=html_content).write_pdf(pdf_path)
    print(f"🚀 SUCCESS: BotBounty_Project_Requirements.pdf compiled successfully at: {pdf_path}")
    print(f"📊 PDF File Size: {os.path.getsize(pdf_path)} bytes")

    # Copy to client/public so it's accessible via web app if needed
    os.makedirs(os.path.dirname(client_pdf_path), exist_ok=True)
    shutil.copyfile(pdf_path, client_pdf_path)
    print(f"📁 Copied PDF to client/public: {client_pdf_path}")

if __name__ == "__main__":
    main()
