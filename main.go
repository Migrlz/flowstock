package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/joho/godotenv"
)

var db *sql.DB

func main() {
	// Load variables from .env
	err := godotenv.Load()
	if err != nil {
		fmt.Println("Could not load .env file")
		return
	}

	// Connect to PostgreSQL
	db, err = sql.Open("pgx", os.Getenv("DATABASE_URL"))
	if err != nil {
		fmt.Println("Database error:", err)
		return
	}

	defer db.Close()

	err = db.Ping()
	if err != nil {
		fmt.Println("Could not connect to database:", err)
		return
	}

	fmt.Println("Connected to PostgreSQL!")

	// API routes
	http.HandleFunc("GET /api/items", home)
	http.HandleFunc("GET /api/items/{barcode}", getItem)
	http.HandleFunc("POST /api/items", createItem)
	http.HandleFunc("PATCH /api/items/{barcode}", updateItem)
	http.HandleFunc("DELETE /api/items/{barcode}", deleteItem)

	http.HandleFunc("GET /api/movements", getMovements)

	fmt.Println("FlowStock API running on http://localhost:8080")

	err = http.ListenAndServe(":8080", cors(http.DefaultServeMux))
	if err != nil {
		fmt.Println("Server error:", err)
	}
}

///////////////////////////////////////////////////////////////////
// TYPES
///////////////////////////////////////////////////////////////////

type Item struct {
	Barcode  string
	Name     string
	Location string
	Status   string
	Quantity int
}

type ItemUpdate struct {
	Status   *string
	Quantity *int
}

type Movement struct {
	ID             int
	Barcode        string
	Name           string
	OldQuantity    int
	NewQuantity    int
	QuantityChange int
	MovementType   string
	Note           string
	CreatedAt      time.Time
}

///////////////////////////////////////////////////////////////////
// ITEMS
///////////////////////////////////////////////////////////////////

func home(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	rows, err := db.Query(`
		SELECT barcode, name, location, status, quantity
		FROM items
		ORDER BY id ASC
	`)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var items []Item

	for rows.Next() {
		var item Item

		err := rows.Scan(
			&item.Barcode,
			&item.Name,
			&item.Location,
			&item.Status,
			&item.Quantity,
		)
		if err != nil {
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}

		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(items)
}

func getItem(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	barcode := r.PathValue("barcode")

	var item Item

	err := db.QueryRow(`
		SELECT barcode, name, location, status, quantity
		FROM items
		WHERE barcode = $1
	`, barcode).Scan(
		&item.Barcode,
		&item.Name,
		&item.Location,
		&item.Status,
		&item.Quantity,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "Item not found", http.StatusNotFound)
		return
	}

	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(item)
}

func createItem(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var newItem Item

	err := json.NewDecoder(r.Body).Decode(&newItem)
	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if newItem.Name == "" ||
		newItem.Barcode == "" ||
		newItem.Location == "" ||
		newItem.Status == "" {

		http.Error(w, "All fields are required", http.StatusBadRequest)
		return
	}

	if newItem.Quantity < 0 {
		http.Error(w, "Quantity cannot be negative", http.StatusBadRequest)
		return
	}

	_, err = db.Exec(`
		INSERT INTO items (
			barcode,
			name,
			location,
			status,
			quantity
		)
		VALUES ($1, $2, $3, $4, $5)
	`,
		newItem.Barcode,
		newItem.Name,
		newItem.Location,
		newItem.Status,
		newItem.Quantity,
	)

	if err != nil {
		http.Error(w, "Could not create item", http.StatusConflict)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(newItem)
}

func updateItem(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	barcode := r.PathValue("barcode")

	var update ItemUpdate

	err := json.NewDecoder(r.Body).Decode(&update)
	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if update.Status == nil && update.Quantity == nil {
		http.Error(w, "No fields to update", http.StatusBadRequest)
		return
	}

	if update.Quantity != nil && *update.Quantity < 0 {
		http.Error(w, "Quantity cannot be negative", http.StatusBadRequest)
		return
	}

	// Start transaction
	tx, err := db.Begin()
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	defer tx.Rollback()

	// Get current item before updating it
	var itemID int
	var oldQuantity int

	err = tx.QueryRow(`
		SELECT id, quantity
		FROM items
		WHERE barcode = $1
		FOR UPDATE
	`, barcode).Scan(
		&itemID,
		&oldQuantity,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "Item not found", http.StatusNotFound)
		return
	}

	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Update item
	_, err = tx.Exec(`
		UPDATE items
		SET
			status = COALESCE($1, status),
			quantity = COALESCE($2, quantity)
		WHERE barcode = $3
	`,
		update.Status,
		update.Quantity,
		barcode,
	)

	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Record quantity movement if quantity changed
	if update.Quantity != nil &&
		*update.Quantity != oldQuantity {

		quantityChange := *update.Quantity - oldQuantity

		_, err = tx.Exec(`
			INSERT INTO inventory_movements (
				item_id,
				old_quantity,
				new_quantity,
				quantity_change,
				movement_type
			)
			VALUES ($1, $2, $3, $4, $5)
		`,
			itemID,
			oldQuantity,
			*update.Quantity,
			quantityChange,
			"adjustment",
		)

		if err != nil {
			http.Error(
				w,
				"Could not record movement",
				http.StatusInternalServerError,
			)
			return
		}
	}

	// Commit transaction
	err = tx.Commit()
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(
		map[string]string{
			"message": "Item updated",
		},
	)
}

func deleteItem(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	barcode := r.PathValue("barcode")

	result, err := db.Exec(`
		DELETE FROM items
		WHERE barcode = $1
	`, barcode)

	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if rowsAffected == 0 {
		http.Error(w, "Item not found", http.StatusNotFound)
		return
	}

	json.NewEncoder(w).Encode(
		map[string]string{
			"message": "Item deleted",
		},
	)
}

///////////////////////////////////////////////////////////////////
// MOVEMENT HISTORY
///////////////////////////////////////////////////////////////////

func getMovements(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	rows, err := db.Query(`
		SELECT
			m.id,
			i.barcode,
			i.name,
			m.old_quantity,
			m.new_quantity,
			m.quantity_change,
			m.movement_type,
			COALESCE(m.note, ''),
			m.created_at
		FROM inventory_movements m
		JOIN items i
			ON m.item_id = i.id
		ORDER BY m.created_at DESC
	`)

	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	defer rows.Close()

	var movements []Movement

	for rows.Next() {
		var movement Movement

		err := rows.Scan(
			&movement.ID,
			&movement.Barcode,
			&movement.Name,
			&movement.OldQuantity,
			&movement.NewQuantity,
			&movement.QuantityChange,
			&movement.MovementType,
			&movement.Note,
			&movement.CreatedAt,
		)

		if err != nil {
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}

		movements = append(movements, movement)
	}

	if err := rows.Err(); err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(movements)
}

///////////////////////////////////////////////////////////////////
// CORS
///////////////////////////////////////////////////////////////////

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(
		w http.ResponseWriter,
		r *http.Request,
	) {
		w.Header().Set(
			"Access-Control-Allow-Origin",
			"http://localhost:5173",
		)

		w.Header().Set(
			"Access-Control-Allow-Methods",
			"GET, POST, PATCH, DELETE, OPTIONS",
		)

		w.Header().Set(
			"Access-Control-Allow-Headers",
			"Content-Type",
		)

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
