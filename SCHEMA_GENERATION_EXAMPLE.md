# AI-Powered Schema Generation

## Problem Solved

Previously, all data was stored as `VARCHAR` in DuckDB, causing incorrect comparisons:

```sql
-- OLD: All VARCHAR - Lexicographic sorting
SELECT MAX("Salary") FROM data;
-- Result: "$80000" (wrong - lexicographically largest)

-- NEW: INTEGER - Numeric sorting  
SELECT MAX("Salary") FROM data;
-- Result: 80000 (correct - numerically largest)
```

## How It Works

### 1. AI Analysis
The AI analyzes sample data to determine appropriate data types:

```typescript
// Sample data: ["$50000", "$75000", "$60000", "$80000"]
// AI determines: INTEGER with displayFormat: "$"
```

### 2. Schema Generation
Creates proper DuckDB schema:

```sql
CREATE TABLE "data" (
  "Name" VARCHAR,
  "Age" INTEGER,
  "Salary" INTEGER,  -- Stores as 50000, 75000, etc.
  "IsActive" BOOLEAN,
  "HireDate" DATE,
  "Department" VARCHAR
);
```

### 3. Data Conversion
Converts data during loading:

```typescript
// Input: "$50000"
// Stored: 50000 (INTEGER)
// Display: "$50000" (with prefix)
```

### 4. Smart Queries
Now queries work correctly:

```sql
-- Find highest salary
SELECT MAX("Salary") FROM data; -- Returns: 80000

-- Find average salary  
SELECT AVG("Salary") FROM data; -- Returns: 66250.0

-- Filter by salary range
SELECT * FROM data WHERE "Salary" > 60000;
```

## Supported Data Types

| Input Example | AI Detected Type | Stored As | Display As |
|---------------|------------------|-----------|------------|
| "$50000" | INTEGER | 50000 | "$50000" |
| "€1,234.56" | DOUBLE | 1234.56 | "€1,234.56" |
| "2023-01-15" | DATE | 2023-01-15 | "1/15/2023" |
| "true" | BOOLEAN | true | "Yes" |
| "John Doe" | VARCHAR | "John Doe" | "John Doe" |

## Benefits

1. **Correct Sorting**: Numbers sort numerically, not lexicographically
2. **Proper Aggregations**: SUM, AVG, MAX, MIN work correctly
3. **Type Safety**: Prevents invalid operations on wrong data types
4. **Display Preservation**: Keeps original formatting for UI
5. **AI Intelligence**: Automatically detects data patterns

## Example Usage

```typescript
import { generateAISchema, generateDuckDBSQL } from './aiSchemaGenerator';

const data = [
  ['Name', 'Salary', 'Age'],
  ['John', '$50000', '25'],
  ['Jane', '$75000', '30']
];

const schema = await generateAISchema('employees', data);
const sql = generateDuckDBSQL(schema);
// Result: CREATE TABLE "employees" ("Name" VARCHAR, "Salary" INTEGER, "Age" INTEGER);
```
