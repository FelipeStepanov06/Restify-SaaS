# Restify - Fast Food Totem Kiosk System

Welcome to the **Restify** project! This is an auto-service kiosk system (SaaS) tailored for fast-food restaurants. It is designed from the ground up to be ultra-lightweight, responsive, and robust, specifically optimized to run efficiently on low-end hardware (e.g., Intel HD 4000 graphics).

## 🏗️ System Architecture

Restify employs a decoupled **Client-Server Architecture**:

1.  **Frontend (Totem Kiosk & Admin Panel)**: 
    *   **Technologies**: Vanilla HTML5, CSS3, and JavaScript (ES6+).
    *   **Design Choice**: By avoiding heavy frameworks like React or Angular, we eliminate virtual DOM overhead, reducing memory footprint and CPU cycles. This is crucial for smooth rendering on older integrated graphics (like Intel HD 4000).
    *   **Components**: 
        *   The main Totem UI (`index.html`, `app.js`, `style.css`) handles customer interactions, carousel animations, and cart management.
        *   The Admin Screen (`admin_screen/`) handles inventory, products, and order monitoring.

2.  **Backend (API & Database)**:
    *   **Technologies**: Python 3, FastAPI, SQLite, Pydantic.
    *   **Design Choice**: FastAPI provides asynchronous request handling, which is highly performant. Python's automatic garbage collection manages memory, but we keep the API stateless to prevent memory leaks. SQLite is used as a lightweight, zero-configuration database that writes directly to disk, avoiding the overhead of a dedicated database server process.
    *   **Components**:
        *   `main.py`: Exposes RESTful endpoints (`/products`, `/orders`, `/ingredients`).
        *   `models.py`: Uses Pydantic for Object-Oriented data validation (POO) ensuring data integrity before it reaches the database.

## 🚀 Future Interoperability (Java & Rust Integration)

To scale this project for a massive multi-tenant SaaS environment, the architecture can evolve:

*   **Rust (Performance Engine)**: The core order processing or price calculation logic could be offloaded to Rust. Rust guarantees memory safety without a garbage collector through its *Ownership and Borrowing* system. We could compile Rust to WebAssembly (WASM) for the frontend or use FFI (Foreign Function Interface) in Python.
*   **Java (Robust Backend)**: As the system grows, the Python backend can be replaced or augmented by a Java Spring Boot microservice. Java enforces strict Object-Oriented Programming (SOLID principles) and provides robust multithreading capabilities for handling thousands of concurrent kiosk transactions.

## 🧠 Memory Management & Hardware Optimization

This project is tailored for machines like the **Dell Inspiron 7520 (i7 3rd Gen, Intel HD 4000)**:
*   **DOM Manipulation**: We use direct DOM updates instead of heavy re-renders. 
*   **Asset Loading**: Images use lazy loading and are requested in optimized dimensions (`w=400&q=80`) to save VRAM on the Intel HD 4000.
*   **Animation**: CSS transitions are used over JavaScript animations to leverage hardware acceleration where possible, without stressing the CPU.

## 🛠️ How to Run

### Backend
1. Ensure Python 3 is installed.
2. Install dependencies:
   ```bash
   pip install fastapi uvicorn pydantic sqlite3
   ```
3. Navigate to the `backend` folder and start the server:
   ```bash
   cd backend
   uvicorn main:app --reload
   ```

### Frontend
1. The frontend requires no build steps (no Webpack, Vite, or npm).
2. Simply open `index.html` in your browser or serve it using a simple HTTP server:
   ```bash
   python -m http.server 8080
   ```
3. Access `http://localhost:8080` for the Totem interface, and navigate to the `/admin_screen` folder for the administrative dashboard.

## 📖 API Endpoints Summary
*   `GET /products`: List all menu items.
*   `POST /orders`: Submit a finalized order and deduct stock.
*   `GET /ingredients`: List available extras and track inventory stock.
*   `POST /estimate-price`: Calculate suggested retail price based on ingredient costs and profit margins.
