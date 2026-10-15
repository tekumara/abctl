import assert from "node:assert/strict";
import test from "node:test";

import {
  buildImportSummaryTable,
  buildPreviewMatchesTable,
  renderImportResult,
} from "../src/import-results.js";

const account = { id: "acct-602", name: "St George 602" };

function countOccurrences(value, pattern) {
  return [...value.matchAll(pattern)].length;
}

const result = {
  errors: [{ message: "Duplicate imported_id" }],
  added: ["txn-1", "txn-2"],
  updated: ["txn-3"],
  updatedPreview: [
    {
      transaction: {
        date: "2025-10-17",
        imported_payee: "Hellofresh",
        amount: -8399,
      },
      ignored: true,
    },
    {
      transaction: {
        date: "2026-07-24",
        imported_payee: "Example Payee",
        amount: 12345,
      },
      existing: { id: "existing-1" },
    },
  ],
};

test("buildImportSummaryTable reports requested import counts", () => {
  const table = buildImportSummaryTable({
    account,
    mapped: 12,
    dryRun: true,
    result,
  });

  assert.equal(table.title, "Import preview");
  assert.equal(table.subtitle, "St George 602 (acct-602)");
  assert.deepEqual(
    table.rows.map((row) => row.cells),
    [
      ["Mapped transactions", "12"],
      ["Added transactions", "2"],
      ["Errors", "1"],
      ["Updated", "1"],
      ["Preview matches", "2"],
    ],
  );
});

test("buildPreviewMatchesTable only projects non-ignored preview matches into table rows", () => {
  const table = buildPreviewMatchesTable(result, { dateFormat: "DD/MM/YYYY" });

  assert.equal(table.title, "Updated");
  assert.deepEqual(
    table.rows.map((row) => row.cells.slice(1)),
    [["Example Payee", "123.45", "false"]],
  );
});

test("renderImportResult includes summary, non-ignored preview table, and error messages", () => {
  const rendered = renderImportResult({
    account,
    mapped: 12,
    dryRun: false,
    dateFormat: "DD/MM/YYYY",
    result,
  });

  assert.match(rendered, /Import result/);
  assert.match(rendered, /Mapped transactions/);
  assert.equal(countOccurrences(rendered, /Preview matches/g), 1);
  assert.equal(countOccurrences(rendered, /Updated/g), 2);
  assert.doesNotMatch(rendered, /Hellofresh/);
  assert.match(rendered, /Example Payee/);
  assert.match(rendered, /24\/07\/2026/);
  assert.doesNotMatch(rendered, /2026-07-24/);
  assert.match(rendered, /Duplicate imported_id/);
});

test("renderImportResult omits updated preview section when there are no updated preview transactions", () => {
  const rendered = renderImportResult({
    account,
    mapped: 12,
    dryRun: true,
    result: {
      errors: [],
      added: [],
      updated: [],
      updatedPreview: [],
    },
  });

  assert.match(rendered, /Import preview/);
  assert.match(rendered, /Mapped transactions/);
  assert.equal(countOccurrences(rendered, /Preview matches/g), 1);
  assert.equal(countOccurrences(rendered, /Updated/g), 1);
  assert.doesNotMatch(rendered, /No matched imported transactions/);
});

test("renderImportResult omits preview table when every preview match is ignored", () => {
  const rendered = renderImportResult({
    account,
    mapped: 12,
    dryRun: true,
    result: {
      errors: [],
      added: [],
      updated: [],
      updatedPreview: [
        {
          transaction: {
            date: "2025-10-17",
            imported_payee: "Hellofresh",
            amount: -8399,
          },
          ignored: true,
        },
      ],
    },
  });

  assert.match(rendered, /Import preview/);
  assert.equal(countOccurrences(rendered, /Preview matches/g), 1);
  assert.equal(countOccurrences(rendered, /Updated/g), 1);
  assert.doesNotMatch(rendered, /Hellofresh/);
});
