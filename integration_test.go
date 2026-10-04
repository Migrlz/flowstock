package main

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"
)

func TestQuantityUpdateIntegration(t *testing.T) {
	testDB := openIntegrationTestDB(t)
	previousDB := db
	db = testDB
	t.Cleanup(func() {
		db = previousDB
	})

	t.Run("quantity update and movement are saved together", func(t *testing.T) {
		itemID, barcode := createIntegrationItem(t, testDB, 12)
		response := patchItemQuantity(t, barcode, 19)

		if response.Code != http.StatusOK {
			t.Fatalf("PATCH status = %d, want %d; response: %s", response.Code, http.StatusOK, response.Body.String())
		}

		var quantity int
		if err := testDB.QueryRow(`SELECT quantity FROM items WHERE id = $1`, itemID).Scan(&quantity); err != nil {
			t.Fatalf("read updated item quantity: %v", err)
		}
		if quantity != 19 {
			t.Errorf("item quantity = %d, want 19", quantity)
		}

		var movementCount int
		if err := testDB.QueryRow(`SELECT COUNT(*) FROM inventory_movements WHERE item_id = $1`, itemID).Scan(&movementCount); err != nil {
			t.Fatalf("count item movements: %v", err)
		}
		if movementCount != 1 {
			t.Fatalf("movement count = %d, want exactly 1", movementCount)
		}

		var oldQuantity, newQuantity, quantityChange int
		err := testDB.QueryRow(`
			SELECT old_quantity, new_quantity, quantity_change
			FROM inventory_movements
			WHERE item_id = $1
		`, itemID).Scan(&oldQuantity, &newQuantity, &quantityChange)
		if err != nil {
			t.Fatalf("read movement: %v", err)
		}
		if oldQuantity != 12 {
			t.Errorf("old_quantity = %d, want 12", oldQuantity)
		}
		if newQuantity != 19 {
			t.Errorf("new_quantity = %d, want 19", newQuantity)
		}
		if quantityChange != 7 {
			t.Errorf("quantity_change = %d, want 7", quantityChange)
		}
	})

	t.Run("status-only update does not create a movement", func(t *testing.T) {
		itemID, barcode := createIntegrationItem(t, testDB, 8)
		request := httptest.NewRequest(
			http.MethodPatch,
			"/api/items/"+barcode,
			strings.NewReader(`{"Status":"processing"}`),
		)
		response := httptest.NewRecorder()
		testHandler().ServeHTTP(response, request)

		if response.Code != http.StatusOK {
			t.Fatalf("PATCH status = %d, want %d; response: %s", response.Code, http.StatusOK, response.Body.String())
		}

		var status string
		var quantity int
		if err := testDB.QueryRow(`SELECT status, quantity FROM items WHERE id = $1`, itemID).Scan(&status, &quantity); err != nil {
			t.Fatalf("read updated item: %v", err)
		}
		if status != "processing" {
			t.Errorf("item status = %q, want %q", status, "processing")
		}
		if quantity != 8 {
			t.Errorf("item quantity = %d, want 8", quantity)
		}

		var movementCount int
		if err := testDB.QueryRow(`SELECT COUNT(*) FROM inventory_movements WHERE item_id = $1`, itemID).Scan(&movementCount); err != nil {
			t.Fatalf("count item movements: %v", err)
		}
		if movementCount != 0 {
			t.Errorf("movement count = %d, want 0", movementCount)
		}
	})

	t.Run("movement insert failure rolls back item update", func(t *testing.T) {
		itemID, barcode := createIntegrationItem(t, testDB, 21)
		constraintName := fmt.Sprintf("flowstock_test_reject_item_%d", itemID)
		constraintSQL := fmt.Sprintf(
			`ALTER TABLE inventory_movements ADD CONSTRAINT %s CHECK (item_id <> %d)`,
			constraintName,
			itemID,
		)
		if _, err := testDB.Exec(constraintSQL); err != nil {
			t.Fatalf("create temporary movement constraint: %v", err)
		}
		t.Cleanup(func() {
			dropConstraintSQL := fmt.Sprintf(
				`ALTER TABLE inventory_movements DROP CONSTRAINT IF EXISTS %s`,
				constraintName,
			)
			if _, err := testDB.Exec(dropConstraintSQL); err != nil {
				t.Errorf("drop temporary movement constraint: %v", err)
			}
		})

		response := patchItemQuantity(t, barcode, 30)
		if response.Code != http.StatusInternalServerError {
			t.Fatalf("PATCH status = %d, want %d; response: %s", response.Code, http.StatusInternalServerError, response.Body.String())
		}
		if !strings.Contains(response.Body.String(), "Could not record movement") {
			t.Fatalf("response = %q, want movement insert failure", response.Body.String())
		}

		var quantity int
		if err := testDB.QueryRow(`SELECT quantity FROM items WHERE id = $1`, itemID).Scan(&quantity); err != nil {
			t.Fatalf("read item after failed update: %v", err)
		}
		if quantity != 21 {
			t.Errorf("item quantity after failed update = %d, want original quantity 21", quantity)
		}

		var movementCount int
		if err := testDB.QueryRow(`SELECT COUNT(*) FROM inventory_movements WHERE item_id = $1`, itemID).Scan(&movementCount); err != nil {
			t.Fatalf("count movements after failed update: %v", err)
		}
		if movementCount != 0 {
			t.Errorf("movement count after failed update = %d, want 0", movementCount)
		}
	})
}

func TestValidateIntegrationTestDatabaseURL(t *testing.T) {
	const normalURL = "postgres://user:secret@localhost:5432/flowstock?sslmode=disable"
	tests := []struct {
		name        string
		testURL     string
		databaseURL string
		wantError   bool
	}{
		{
			name:        "same URL as application database",
			testURL:     normalURL,
			databaseURL: normalURL,
			wantError:   true,
		},
		{
			name:        "normal FlowStock database name",
			testURL:     "postgres://user:secret@localhost:5432/flowstock?sslmode=disable",
			databaseURL: "",
			wantError:   true,
		},
		{
			name:        "same database name with a different URL",
			testURL:     "postgres://other:secret@localhost:5432/flowstock?sslmode=require",
			databaseURL: normalURL,
			wantError:   true,
		},
		{
			name:        "test database name does not end in test",
			testURL:     "postgres://user:secret@localhost:5432/flowstock_dev?sslmode=disable",
			databaseURL: normalURL,
			wantError:   true,
		},
		{
			name:        "separate test database",
			testURL:     "postgres://user:secret@localhost:5432/flowstock_test?sslmode=disable",
			databaseURL: normalURL,
			wantError:   false,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			err := validateIntegrationTestDatabaseURL(test.testURL, test.databaseURL)
			if (err != nil) != test.wantError {
				t.Fatalf("validation error = %v, wantError %t", err, test.wantError)
			}
		})
	}
}

func TestSplitMigrationStatements(t *testing.T) {
	contents := `-- migration note
BEGIN;
CREATE TABLE example (id INTEGER PRIMARY KEY);
-- another note
CREATE INDEX example_id_idx ON example (id);
COMMIT;
`

	statements := splitMigrationStatements(contents)
	if len(statements) != 2 {
		t.Fatalf("statement count = %d, want 2: %#v", len(statements), statements)
	}
	if statements[0] != "CREATE TABLE example (id INTEGER PRIMARY KEY)" {
		t.Errorf("first statement = %q", statements[0])
	}
	if statements[1] != "CREATE INDEX example_id_idx ON example (id)" {
		t.Errorf("second statement = %q", statements[1])
	}
}

func openIntegrationTestDB(t *testing.T) *sql.DB {
	t.Helper()

	testURL := strings.TrimSpace(os.Getenv("TEST_DATABASE_URL"))
	if testURL == "" {
		t.Skip("set TEST_DATABASE_URL to a dedicated *_test database to run PostgreSQL integration tests")
	}
	if err := validateIntegrationTestDatabaseURL(testURL, os.Getenv("DATABASE_URL")); err != nil {
		t.Fatal(err)
	}

	testDB, err := sql.Open("pgx", testURL)
	if err != nil {
		t.Fatal("could not open TEST_DATABASE_URL")
	}
	t.Cleanup(func() {
		if err := testDB.Close(); err != nil {
			t.Errorf("close test database: %v", err)
		}
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := testDB.PingContext(ctx); err != nil {
		t.Fatal("could not connect to the isolated TEST_DATABASE_URL database")
	}
	if err := applyIntegrationTestMigrations(testDB); err != nil {
		t.Fatalf("apply migrations to the isolated test database: %v", err)
	}

	return testDB
}

func validateIntegrationTestDatabaseURL(testURL, databaseURL string) error {
	testURL = strings.TrimSpace(testURL)
	databaseURL = strings.TrimSpace(databaseURL)
	if testURL == "" {
		return fmt.Errorf("TEST_DATABASE_URL is empty")
	}
	if databaseURL != "" && testURL == databaseURL {
		return fmt.Errorf("TEST_DATABASE_URL must not equal DATABASE_URL")
	}

	testTarget, err := url.Parse(testURL)
	if err != nil || (testTarget.Scheme != "postgres" && testTarget.Scheme != "postgresql") {
		return fmt.Errorf("TEST_DATABASE_URL must be a PostgreSQL URL for a dedicated test database")
	}
	testDatabaseName := strings.TrimPrefix(testTarget.Path, "/")
	if testTarget.Hostname() == "" || testDatabaseName == "" {
		return fmt.Errorf("TEST_DATABASE_URL must include a host and a dedicated database name")
	}
	if strings.EqualFold(testDatabaseName, "flowstock") || !strings.HasSuffix(strings.ToLower(testDatabaseName), "_test") {
		return fmt.Errorf("TEST_DATABASE_URL must point to a separate database whose name ends in _test")
	}

	if databaseURL != "" {
		databaseTarget, parseErr := url.Parse(databaseURL)
		if parseErr == nil {
			databaseName := strings.TrimPrefix(databaseTarget.Path, "/")
			if databaseName != "" && strings.EqualFold(testDatabaseName, databaseName) {
				return fmt.Errorf("TEST_DATABASE_URL must not target the same database as DATABASE_URL")
			}
		}
	}

	return nil
}

func applyIntegrationTestMigrations(testDB *sql.DB) error {
	_, err := testDB.Exec(`
		CREATE TABLE IF NOT EXISTS flowstock_test_migrations (
			version TEXT PRIMARY KEY,
			applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		return fmt.Errorf("create test migration history: %w", err)
	}

	_, sourceFile, _, ok := runtime.Caller(0)
	if !ok {
		return fmt.Errorf("locate integration test source directory")
	}
	migrationDirectory := filepath.Join(filepath.Dir(sourceFile), "database", "migrations")
	for _, migrationName := range []string{
		"001_initial_schema.sql",
		"002_add_movement_indexes.sql",
	} {
		migrationPath := filepath.Join(migrationDirectory, migrationName)
		contents, err := os.ReadFile(migrationPath)
		if err != nil {
			return fmt.Errorf("read migration %s: %w", migrationName, err)
		}
		if err := applyIntegrationTestMigration(testDB, migrationName, string(contents)); err != nil {
			return err
		}
	}

	return nil
}

func applyIntegrationTestMigration(testDB *sql.DB, version, contents string) error {
	tx, err := testDB.Begin()
	if err != nil {
		return fmt.Errorf("begin migration %s: %w", version, err)
	}
	defer tx.Rollback()

	var alreadyApplied bool
	err = tx.QueryRow(`
		SELECT EXISTS (
			SELECT 1 FROM flowstock_test_migrations WHERE version = $1
		)
	`, version).Scan(&alreadyApplied)
	if err != nil {
		return fmt.Errorf("check migration %s: %w", version, err)
	}
	if alreadyApplied {
		return nil
	}

	for index, statement := range splitMigrationStatements(contents) {
		if _, err := tx.Exec(statement); err != nil {
			return fmt.Errorf("execute migration %s statement %d: %w", version, index+1, err)
		}
	}
	if _, err := tx.Exec(`INSERT INTO flowstock_test_migrations (version) VALUES ($1)`, version); err != nil {
		return fmt.Errorf("record migration %s: %w", version, err)
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit migration %s: %w", version, err)
	}

	return nil
}

// The current migration files use semicolon-terminated DDL without procedural
// blocks. Their BEGIN/COMMIT wrappers are applied by the transaction above.
func splitMigrationStatements(contents string) []string {
	var statements []string
	for _, chunk := range strings.Split(contents, ";") {
		var lines []string
		for _, line := range strings.Split(chunk, "\n") {
			if strings.HasPrefix(strings.TrimSpace(line), "--") {
				continue
			}
			lines = append(lines, line)
		}

		statement := strings.TrimSpace(strings.Join(lines, "\n"))
		if statement == "" || strings.EqualFold(statement, "BEGIN") || strings.EqualFold(statement, "COMMIT") {
			continue
		}
		statements = append(statements, statement)
	}

	return statements
}

func createIntegrationItem(t *testing.T, testDB *sql.DB, quantity int) (int, string) {
	t.Helper()

	barcode := fmt.Sprintf("TEST-%d", time.Now().UnixNano())
	var itemID int
	err := testDB.QueryRow(`
		INSERT INTO items (barcode, name, location, status, quantity)
		VALUES ($1, 'Integration test item', 'TEST', 'available', $2)
		RETURNING id
	`, barcode, quantity).Scan(&itemID)
	if err != nil {
		t.Fatalf("create test item: %v", err)
	}
	t.Cleanup(func() {
		if _, err := testDB.Exec(`DELETE FROM items WHERE id = $1`, itemID); err != nil {
			t.Errorf("clean up test item: %v", err)
		}
	})

	return itemID, barcode
}

func patchItemQuantity(t *testing.T, barcode string, quantity int) *httptest.ResponseRecorder {
	t.Helper()

	request := httptest.NewRequest(
		http.MethodPatch,
		"/api/items/"+barcode,
		strings.NewReader(fmt.Sprintf(`{"Quantity":%d}`, quantity)),
	)
	response := httptest.NewRecorder()
	testHandler().ServeHTTP(response, request)
	return response
}
