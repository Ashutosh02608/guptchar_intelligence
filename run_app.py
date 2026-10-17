"""
Guptchar Unified Master Launcher
Runs both the Unified Backend (Surveillance + Extractor + Neon PostgreSQL on :8000)
and the Frontend Dashboard (on :5173) simultaneously in a single terminal.
Press Ctrl+C to terminate both processes cleanly.
"""
import subprocess
import sys
import os
import signal
import time

def main():
    print("=" * 60)
    print("  [*] GUPTCHAR - 24*7 REGULATORY SURVEILLANCE & INTELLIGENCE")
    print("=" * 60)
    print("[*] Unified Backend:  http://127.0.0.1:8000")
    print("[*] Extractor OSINT:  http://127.0.0.1:8000/extractor")
    print("[*] Frontend UI:      http://localhost:5173")
    print("[*] Cloud Database:   Neon PostgreSQL (Active)")
    print("[*] Press Ctrl+C at any time to stop all services.\n")

    # Start Unified Backend
    backend_proc = subprocess.Popen([sys.executable, "backend/run.py"])
    
    # Start Frontend
    frontend_proc = subprocess.Popen(["npm", "--prefix", "frontend", "run", "dev"], shell=True)

    def shutdown(sig=None, frame=None):
        print("\n[*] Gracefully stopping all Guptchar services...")
        try:
            backend_proc.terminate()
            frontend_proc.terminate()
            backend_proc.wait(timeout=3)
            frontend_proc.wait(timeout=3)
        except Exception:
            backend_proc.kill()
            frontend_proc.kill()
        print("[+] All services stopped.")
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, shutdown)

    try:
        while True:
            time.sleep(1)
            if backend_proc.poll() is not None or frontend_proc.poll() is not None:
                break
    except KeyboardInterrupt:
        shutdown()

if __name__ == "__main__":
    main()
