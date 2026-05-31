"""
============================================================================
 RESTIFY — Security Vulnerability Test Suite
 ============================================================================
 This script demonstrates and verifies each vulnerability documented in the
 security audit. Run against a LOCAL development server only.

 Usage:
   cd backend
   pip install requests
   python security_tests.py

 Prerequisites:
   - Backend running: uvicorn main:app --reload
============================================================================
"""

import requests
import json
import time
import sys

# --- Configuration ---
BASE_URL = "http://127.0.0.1:8000"

# --- Color output helpers ---
class Colors:
    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    CYAN = "\033[96m"
    BOLD = "\033[1m"
    RESET = "\033[0m"

def header(text):
    print(f"\n{Colors.BOLD}{Colors.CYAN}{'='*70}")
    print(f" {text}")
    print(f"{'='*70}{Colors.RESET}\n")

def vuln_title(code, title, severity):
    color = Colors.RED if severity == "CRITICA" else Colors.YELLOW
    print(f"  {color}{Colors.BOLD}[{code}] {title} — Severidade: {severity}{Colors.RESET}")

def result(success, message):
    icon = f"{Colors.RED}✘ VULNERÁVEL" if success else f"{Colors.GREEN}✔ PROTEGIDO"
    print(f"    {icon}{Colors.RESET} — {message}")

def info(message):
    print(f"    {Colors.YELLOW}ℹ {message}{Colors.RESET}")


def check_server():
    """Verify the backend server is running before testing."""
    try:
        r = requests.get(f"{BASE_URL}/products", timeout=3)
        return r.status_code == 200
    except requests.ConnectionError:
        return False


# ============================================================================
# VULN-01: No Authentication on any route
# ============================================================================
def test_vuln_01():
    vuln_title("VULN-01", "API sem autenticação", "CRITICA")

    # Try to access admin-only endpoints without any auth
    endpoints = [
        ("GET", "/products"),
        ("GET", "/ingredients"),
        ("GET", "/orders"),
        ("GET", "/categories"),
    ]

    all_accessible = True
    for method, path in endpoints:
        r = requests.request(method, f"{BASE_URL}{path}")
        if r.status_code != 200:
            all_accessible = False
            break

    result(all_accessible, f"Todas as rotas retornaram 200 sem autenticação")

    # Try destructive endpoints (POST a test product)
    test_product = {
        "name": "TESTE_SEGURANCA_01",
        "price": 99.99,
        "cat": "comida",
        "img": "https://test.com/img.jpg",
        "default_ingredients": []
    }
    r = requests.post(f"{BASE_URL}/products", json=test_product)
    can_create = r.status_code == 200
    result(can_create, f"POST /products sem auth → status {r.status_code}")

    # Cleanup: delete the test product
    if can_create:
        created_id = r.json().get("id")
        requests.delete(f"{BASE_URL}/products/{created_id}")

    return all_accessible


# ============================================================================
# VULN-02: Client-side price trust (price manipulation)
# ============================================================================
def test_vuln_02():
    vuln_title("VULN-02", "Preço definido pelo cliente", "CRITICA")

    # Submit an order with a fraudulently low price
    fraudulent_order = {
        "items": [{
            "productId": 1,
            "name": "Classic Burger",
            "img": "https://test.com/img.jpg",
            "basePrice": 0.01,       # Real price: R$ 24.90
            "extras": 0,
            "mods": [],
            "modsDetail": [],
            "qty": 5
        }],
        "total": 0.05,               # Should be R$ 124.50
        "dineOption": "eat-in",
        "timestamp": "2026-05-31T00:00:00.000Z"
    }

    r = requests.post(f"{BASE_URL}/orders", json=fraudulent_order)
    accepted = r.status_code == 200

    if accepted:
        order_id = r.json().get("id")
        info(f"Pedido #{order_id} criado com total de R$ 0,05 (deveria ser R$ 124,50)")

    result(accepted, f"Backend aceitou preço fraudulento → status {r.status_code}")
    return accepted


# ============================================================================
# VULN-03: CORS wildcard
# ============================================================================
def test_vuln_03():
    vuln_title("VULN-03", "CORS totalmente aberto", "CRITICA")

    # Simulate cross-origin request with a spoofed Origin header
    headers = {
        "Origin": "https://hacker-evil-site.com",
        "Content-Type": "application/json"
    }

    r = requests.get(f"{BASE_URL}/products", headers=headers)
    cors_header = r.headers.get("access-control-allow-origin", "")
    is_open = cors_header == "*"

    info(f"Access-Control-Allow-Origin: '{cors_header}'")
    result(is_open, f"CORS permite qualquer origem" if is_open else "CORS restrito")

    # Check preflight
    r2 = requests.options(f"{BASE_URL}/products", headers={
        "Origin": "https://hacker-evil-site.com",
        "Access-Control-Request-Method": "DELETE"
    })
    allows_delete = "DELETE" in r2.headers.get("access-control-allow-methods", "").upper()
    result(allows_delete, "Preflight aceita método DELETE de origem maliciosa")

    return is_open


# ============================================================================
# VULN-04: Product manipulation from totem
# ============================================================================
def test_vuln_04():
    vuln_title("VULN-04", "Manipulação de produtos pelo totem", "CRITICA")

    # Step 1: Get current products
    r = requests.get(f"{BASE_URL}/products")
    products = r.json()

    if len(products) == 0:
        info("Nenhum produto encontrado para testar. Pulando.")
        return False

    # Pick the first product
    original = products[0]
    original_id = original["id"]
    original_price = original["price"]

    # Step 2: Modify the price (simulate totem user)
    modified = {
        "name": original["name"],
        "price": 0.01,  # Fraudulent price
        "cat": original.get("cat", "comida"),
        "img": original.get("img", ""),
        "default_ingredients": original.get("default_ingredients", [])
    }

    r = requests.put(f"{BASE_URL}/products/{original_id}", json=modified)
    could_modify = r.status_code == 200

    if could_modify:
        # Verify the price was actually changed
        r2 = requests.get(f"{BASE_URL}/products")
        modified_product = next((p for p in r2.json() if p["id"] == original_id), None)
        if modified_product:
            info(f"Preço do '{original['name']}' alterado: R$ {original_price} → R$ {modified_product['price']}")

        # RESTORE original price
        restore = {
            "name": original["name"],
            "price": original_price,
            "cat": original.get("cat", "comida"),
            "img": original.get("img", ""),
            "default_ingredients": original.get("default_ingredients", [])
        }
        requests.put(f"{BASE_URL}/products/{original_id}", json=restore)
        info(f"Preço restaurado para R$ {original_price}")

    result(could_modify, f"PUT /products/{original_id} sem auth → status {r.status_code}")
    return could_modify


# ============================================================================
# VULN-05: No price validation (negative/zero prices)
# ============================================================================
def test_vuln_05():
    vuln_title("VULN-05", "Sem validação de preço negativo/zero", "ALTA")

    # Try creating a product with negative price
    test_product = {
        "name": "TESTE_PRECO_NEGATIVO",
        "price": -50.00,
        "cat": "comida",
        "img": "https://test.com/img.jpg",
        "default_ingredients": []
    }

    r = requests.post(f"{BASE_URL}/products", json=test_product)
    accepted_negative = r.status_code == 200

    if accepted_negative:
        created_id = r.json().get("id")
        info(f"Produto criado com preço R$ -50,00 (ID: {created_id})")
        requests.delete(f"{BASE_URL}/products/{created_id}")

    result(accepted_negative, f"Backend aceitou preço negativo → status {r.status_code}")

    # Try zero price
    test_product["name"] = "TESTE_PRECO_ZERO"
    test_product["price"] = 0
    r = requests.post(f"{BASE_URL}/products", json=test_product)
    accepted_zero = r.status_code == 200

    if accepted_zero:
        created_id = r.json().get("id")
        info(f"Produto criado com preço R$ 0,00 (ID: {created_id})")
        requests.delete(f"{BASE_URL}/products/{created_id}")

    result(accepted_zero, f"Backend aceitou preço zero → status {r.status_code}")
    return accepted_negative or accepted_zero


# ============================================================================
# VULN-06: No rate limiting (DoS susceptibility)
# ============================================================================
def test_vuln_06():
    vuln_title("VULN-06", "Sem rate limiting", "ALTA")

    # Send 50 rapid requests
    count = 50
    success = 0
    start = time.time()

    for _ in range(count):
        r = requests.get(f"{BASE_URL}/products")
        if r.status_code == 200:
            success += 1

    elapsed = time.time() - start
    rate = count / elapsed

    info(f"{success}/{count} requests em {elapsed:.2f}s ({rate:.0f} req/s)")
    all_passed = success == count
    result(all_passed, f"Todas as {count} requests rápidas aceitas sem throttle")
    return all_passed


# ============================================================================
# VULN-07: XSS via product name
# ============================================================================
def test_vuln_07():
    vuln_title("VULN-07", "XSS via campo de nome/imagem", "ALTA")

    xss_payloads = [
        '<img src=x onerror="alert(1)">',
        '<script>alert("xss")</script>',
        '"><svg onload=alert(1)>',
    ]

    vulnerable = False
    for payload in xss_payloads:
        test_product = {
            "name": payload,
            "price": 10.00,
            "cat": "comida",
            "img": "https://test.com/img.jpg",
            "default_ingredients": []
        }
        r = requests.post(f"{BASE_URL}/products", json=test_product)
        if r.status_code == 200:
            vulnerable = True
            created_id = r.json().get("id")
            info(f"Payload XSS aceito e armazenado: {payload[:40]}...")
            requests.delete(f"{BASE_URL}/products/{created_id}")

    result(vulnerable, "Backend aceita e armazena payloads XSS")
    return vulnerable


# ============================================================================
# VULN-08: Negative stock manipulation
# ============================================================================
def test_vuln_08():
    vuln_title("VULN-08", "Manipulação de estoque (qty negativo)", "ALTA")

    # First, check if there are ingredients
    r = requests.get(f"{BASE_URL}/ingredients")
    ingredients = r.json()

    if len(ingredients) == 0:
        info("Nenhum ingrediente encontrado. Criando um para teste...")
        test_ing = {
            "name": "TESTE_ESTOQUE",
            "price": 1.0,
            "img": "https://test.com/img.jpg",
            "cats": ["comida"],
            "stock": 10
        }
        r = requests.post(f"{BASE_URL}/ingredients", json=test_ing)
        if r.status_code != 200:
            info("Não foi possível criar ingrediente de teste.")
            return False
        ing_id = r.json().get("id")
        ing_name = "TESTE_ESTOQUE"
        initial_stock = 10
    else:
        ing = ingredients[0]
        ing_id = ing["id"]
        ing_name = ing["name"]
        initial_stock = ing.get("stock", 0)

    info(f"Ingrediente: '{ing_name}' (ID: {ing_id}), Estoque inicial: {initial_stock}")

    # Try order with negative qty to increase stock
    order = {
        "items": [{
            "productId": 1,
            "name": "Test",
            "img": "",
            "basePrice": 10.0,
            "extras": 0,
            "mods": [ing_name],
            "modsDetail": [{"name": ing_name, "qty": -100}],  # NEGATIVE!
            "qty": 1
        }],
        "total": 10.0,
        "dineOption": "eat-in",
        "timestamp": "2026-05-31T00:00:00.000Z"
    }

    r = requests.post(f"{BASE_URL}/orders", json=order)
    if r.status_code == 200:
        # Check if stock was increased
        r2 = requests.get(f"{BASE_URL}/ingredients")
        updated_ing = next((i for i in r2.json() if i["id"] == ing_id), None)
        if updated_ing:
            new_stock = updated_ing.get("stock", 0)
            stock_increased = new_stock > initial_stock
            info(f"Estoque após pedido com qty=-100: {initial_stock} → {new_stock}")

            if stock_increased:
                # Restore stock
                restore = {
                    "name": updated_ing["name"],
                    "price": updated_ing["price"],
                    "img": updated_ing["img"],
                    "cats": updated_ing.get("cats", []),
                    "stock": initial_stock
                }
                requests.put(f"{BASE_URL}/ingredients/{ing_id}", json=restore)
                info(f"Estoque restaurado para {initial_stock}")

            result(stock_increased, "Qty negativo aumentou o estoque!")
            return stock_increased

    result(False, "Pedido rejeitado ou sem efeito")
    return False


# ============================================================================
# Summary & Main
# ============================================================================
def main():
    header("RESTIFY — Suite de Testes de Segurança")

    if not check_server():
        print(f"  {Colors.RED}{Colors.BOLD}ERRO: Backend não está rodando em {BASE_URL}")
        print(f"  Execute: uvicorn main:app --reload{Colors.RESET}")
        sys.exit(1)

    info(f"Servidor detectado em {BASE_URL}\n")

    results = {}

    header("VULNERABILIDADES CRÍTICAS")
    results["VULN-01"] = test_vuln_01()
    print()
    results["VULN-02"] = test_vuln_02()
    print()
    results["VULN-03"] = test_vuln_03()
    print()
    results["VULN-04"] = test_vuln_04()

    header("VULNERABILIDADES ALTAS")
    results["VULN-05"] = test_vuln_05()
    print()
    results["VULN-06"] = test_vuln_06()
    print()
    results["VULN-07"] = test_vuln_07()
    print()
    results["VULN-08"] = test_vuln_08()

    # Final summary
    header("RESUMO FINAL")

    vuln_count = sum(1 for v in results.values() if v)
    safe_count = sum(1 for v in results.values() if not v)

    for code, is_vuln in results.items():
        status = f"{Colors.RED}VULNERÁVEL" if is_vuln else f"{Colors.GREEN}PROTEGIDO"
        print(f"    {status}{Colors.RESET}  {code}")

    print()
    if vuln_count > 0:
        print(f"  {Colors.RED}{Colors.BOLD}⚠  {vuln_count} vulnerabilidade(s) confirmada(s){Colors.RESET}")
    if safe_count > 0:
        print(f"  {Colors.GREEN}{Colors.BOLD}✔  {safe_count} teste(s) passou/passaram{Colors.RESET}")

    print(f"\n  Total de testes: {len(results)}")
    print()


if __name__ == "__main__":
    main()
