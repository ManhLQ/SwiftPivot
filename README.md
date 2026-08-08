# SwiftPivot

SwiftPivot is a lightweight, locally run pivot table tool designed for high-frequency criteria shifting and ad-hoc data analysis. It enables users to quickly ingest small-to-medium datasets (under 1,000 rows) and perform rapid interactive analysis.

## 🔒 Privacy & Security

**Your data never leaves your browser.** SwiftPivot operates entirely on the client side. Any files you upload or data you fetch are processed locally on your machine and are never sent to any external server.

## Key Features

- ⚡ **Flexible Data Ingestion**: Load local CSV or JSON files, or fetch directly from REST APIs using browser-based cookie authentication.
- 📝 **Inline Raw Data Editor**: View and modify your loaded data in a clean grid layout. Any edits automatically trigger instant updates in the pivot view.
- 📊 **Dynamic Pivot Table & Charts**: Drag-and-drop fields to construct custom pivot tables, apply criteria filtering, control aggregation methods, and instantly plot bar, line, or heatmap charts.
- 💾 **Local Persistence**: Automatically persists your configuration and change log to local storage so you don't lose your work.

## Getting Started

### Installation

Install dependencies using npm:

```bash
npm install
```

### Running Locally

To start the development server:

```bash
npm run dev
```

### Running Tests

To run the unit tests:

```bash
npm run test
```
