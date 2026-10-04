package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// testHandler uses the application handlers without starting a server.
func testHandler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/items", createItem)
	mux.HandleFunc("PATCH /api/items/{barcode}", updateItem)

	return cors(mux)
}

func TestCreateItemBadRequests(t *testing.T) {
	tests := []struct {
		name string
		body string
	}{
		{
			name: "invalid JSON",
			body: `{"Barcode":`,
		},
		{
			name: "empty required field",
			body: `{"Barcode":"B-001","Name":"","Location":"A1","Status":"available","Quantity":1}`,
		},
		{
			name: "negative quantity",
			body: `{"Barcode":"B-001","Name":"Widget","Location":"A1","Status":"available","Quantity":-1}`,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			request := httptest.NewRequest(
				http.MethodPost,
				"/api/items",
				strings.NewReader(test.body),
			)
			response := httptest.NewRecorder()

			testHandler().ServeHTTP(response, request)

			if response.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, want %d", response.Code, http.StatusBadRequest)
			}
		})
	}
}

func TestUpdateItemBadRequests(t *testing.T) {
	tests := []struct {
		name string
		body string
	}{
		{
			name: "invalid JSON",
			body: `{"Quantity":`,
		},
		{
			name: "no fields to update",
			body: `{}`,
		},
		{
			name: "negative quantity",
			body: `{"Quantity":-1}`,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			request := httptest.NewRequest(
				http.MethodPatch,
				"/api/items/B-001",
				strings.NewReader(test.body),
			)
			response := httptest.NewRecorder()

			testHandler().ServeHTTP(response, request)

			if response.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, want %d", response.Code, http.StatusBadRequest)
			}
		})
	}
}

func TestCORSOptions(t *testing.T) {
	nextCalled := false
	handler := cors(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled = true
	}))
	request := httptest.NewRequest(http.MethodOptions, "/api/items", nil)
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, request)

	if response.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusNoContent)
	}
	if got, want := response.Header().Get("Access-Control-Allow-Origin"), "http://localhost:5173"; got != want {
		t.Errorf("Access-Control-Allow-Origin = %q, want %q", got, want)
	}
	if got, want := response.Header().Get("Access-Control-Allow-Methods"), "GET, POST, PATCH, DELETE, OPTIONS"; got != want {
		t.Errorf("Access-Control-Allow-Methods = %q, want %q", got, want)
	}
	if got, want := response.Header().Get("Access-Control-Allow-Headers"), "Content-Type"; got != want {
		t.Errorf("Access-Control-Allow-Headers = %q, want %q", got, want)
	}
	if nextCalled {
		t.Error("next handler was called for an OPTIONS request")
	}
}
