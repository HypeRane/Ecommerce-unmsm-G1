package main

import "testing"

func TestListProductsFiltersAndPagination(t *testing.T) {
	store := newProductStore()

	items, meta := store.list(productFilters{Search: "mo", Category: "tecnologia", Sort: "price_desc", Page: 1, Limit: 1})

	if meta.Total != 2 {
		t.Fatalf("expected total 2, got %d", meta.Total)
	}
	if len(items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(items))
	}
	if items[0].Name != "Mochila Tech" {
		t.Fatalf("expected first item Mochila Tech, got %s", items[0].Name)
	}
}

func TestCreateUpdateDeleteProduct(t *testing.T) {
	store := newProductStore()

	created := store.create(Product{Name: "Lápiz", Price: 5, Stock: 50, Category: "papeleria"})
	if created.ID == "" {
		t.Fatal("expected created product to have an id")
	}

	updated, ok := store.update(created.ID, Product{Name: "Lápiz Pro", Price: 7, Stock: 60, Category: "papeleria"})
	if !ok {
		t.Fatal("expected update to succeed")
	}
	if updated.Name != "Lápiz Pro" {
		t.Fatalf("expected updated name to be Lápiz Pro, got %s", updated.Name)
	}

	if !store.delete(created.ID) {
		t.Fatal("expected delete to succeed")
	}
}
