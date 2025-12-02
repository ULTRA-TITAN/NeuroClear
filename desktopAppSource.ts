export const PYTHON_SOURCE = `import customtkinter as ctk
import psutil
import ctypes
import sys
import os
import threading
import json
import tkinter.messagebox as messagebox
import google.generativeai as genai
from typing import List, Dict

# --- Configuration & Assets ---
ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")

# Critical System Processes (Safety Filter)
CRITICAL_PROCESSES = {
    'svchost.exe', 'System', 'Registry', 'smss.exe', 'csrss.exe', 
    'wininit.exe', 'services.exe', 'lsass.exe', 'explorer.exe', 
    'Memory Compression', 'Taskmgr.exe', 'spoolsv.exe', 'RuntimeBroker.exe',
    'winlogon.exe', 'fontdrvhost.exe', 'dwm.exe'
}

class NeuroClearApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        # --- Admin Check ---
        if not self.is_admin():
            self.restart_as_admin()
            return

        # --- Window Setup ---
        self.title("NeuroClear - AI RAM Optimizer")
        self.geometry("1000x700")
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1) # Content area expands

        # --- State ---
        self.processes: List[Dict] = []
        self.api_key = os.getenv("API_KEY")
        self.scan_thread = None

        # --- UI Components ---
        self.create_header()
        self.create_process_list()
        self.create_controls()
        
        # --- Memory Monitor Timer ---
        self.update_memory_stats()

    def is_admin(self):
        try:
            return ctypes.windll.shell32.IsUserAnAdmin()
        except:
            return False

    def restart_as_admin(self):
        ctypes.windll.shell32.ShellExecuteW(
            None, "runas", sys.executable, " ".join(sys.argv), None, 1
        )
        sys.exit()

    def create_header(self):
        self.header_frame = ctk.CTkFrame(self, height=100, corner_radius=10, fg_color="transparent")
        self.header_frame.grid(row=0, column=0, padx=20, pady=20, sticky="ew")
        
        # Title
        self.title_label = ctk.CTkLabel(
            self.header_frame, 
            text="NeuroClear", 
            font=ctk.CTkFont(family="Roboto", size=28, weight="bold"),
            text_color="#00f3ff"
        )
        self.title_label.pack(side="left", padx=10)
        
        self.subtitle_label = ctk.CTkLabel(
            self.header_frame,
            text="AI-POWERED SYSTEM OPTIMIZER",
            font=ctk.CTkFont(size=12),
            text_color="gray"
        )
        self.subtitle_label.pack(side="left", pady=(10, 0))

        # Memory Gauge
        self.mem_frame = ctk.CTkFrame(self.header_frame, fg_color="#1a1a1a", corner_radius=15)
        self.mem_frame.pack(side="right", fill="y", padx=10)
        
        self.mem_label = ctk.CTkLabel(
            self.mem_frame, 
            text="RAM USAGE", 
            font=ctk.CTkFont(size=10, weight="bold")
        )
        self.mem_label.pack(pady=(10, 0), padx=20)
        
        self.mem_value = ctk.CTkLabel(
            self.mem_frame, 
            text="--%", 
            font=ctk.CTkFont(family="Roboto Mono", size=32, weight="bold"),
            text_color="#00ff9d"
        )
        self.mem_value.pack(pady=(0, 5), padx=20)
        
        self.mem_details = ctk.CTkLabel(
            self.mem_frame,
            text="-- / -- GB",
            font=ctk.CTkFont(size=11),
            text_color="gray"
        )
        self.mem_details.pack(pady=(0, 10))

    def create_process_list(self):
        # Container
        self.list_container = ctk.CTkFrame(self, corner_radius=10)
        self.list_container.grid(row=1, column=0, padx=20, pady=(0, 20), sticky="nsew")
        self.list_container.grid_columnconfigure(0, weight=1)
        self.list_container.grid_rowconfigure(1, weight=1)

        # Columns Header
        headers = ctk.CTkFrame(self.list_container, height=40, fg_color="transparent")
        headers.grid(row=0, column=0, sticky="ew", padx=10, pady=5)
        
        ctk.CTkLabel(headers, text="PROCESS NAME", width=200, anchor="w", font=ctk.CTkFont(weight="bold")).pack(side="left", padx=10)
        ctk.CTkLabel(headers, text="MEMORY", width=80, anchor="e", font=ctk.CTkFont(weight="bold")).pack(side="right", padx=10)
        ctk.CTkLabel(headers, text="AI ANALYSIS", anchor="w", font=ctk.CTkFont(weight="bold")).pack(side="left", padx=10, fill="x", expand=True)

        # Scrollable Area
        self.scroll_frame = ctk.CTkScrollableFrame(self.list_container, fg_color="transparent")
        self.scroll_frame.grid(row=1, column=0, sticky="nsew", padx=5, pady=5)

    def create_controls(self):
        self.control_frame = ctk.CTkFrame(self, height=80, corner_radius=10, fg_color="#1a1a1a")
        self.control_frame.grid(row=2, column=0, padx=20, pady=(0, 20), sticky="ew")

        # API Key Input (if not in env)
        if not self.api_key:
            self.api_entry = ctk.CTkEntry(
                self.control_frame, 
                placeholder_text="Enter Gemini API Key...",
                width=300
            )
            self.api_entry.pack(side="left", padx=20, pady=20)
        
        # Action Buttons
        self.clean_btn = ctk.CTkButton(
            self.control_frame,
            text="CLEAN SELECTED",
            fg_color="#ef4444",
            hover_color="#dc2626",
            state="disabled",
            command=self.clean_processes,
            font=ctk.CTkFont(weight="bold")
        )
        self.clean_btn.pack(side="right", padx=20, pady=20)

        self.scan_btn = ctk.CTkButton(
            self.control_frame,
            text="START SMART SCAN",
            fg_color="#00f3ff",
            text_color="#000000",
            hover_color="#00dbe6",
            command=self.start_scan_thread,
            font=ctk.CTkFont(weight="bold")
        )
        self.scan_btn.pack(side="right", padx=10, pady=20)
        
        self.status_label = ctk.CTkLabel(self.control_frame, text="Ready", text_color="gray")
        self.status_label.pack(side="left", padx=10)

    # --- Logic Methods ---

    def update_memory_stats(self):
        mem = psutil.virtual_memory()
        self.mem_value.configure(text=f"{mem.percent}%")
        used_gb = mem.used / (1024 ** 3)
        total_gb = mem.total / (1024 ** 3)
        self.mem_details.configure(text=f"{used_gb:.1f} / {total_gb:.1f} GB")
        
        # Color coding
        if mem.percent > 85:
            self.mem_value.configure(text_color="#ef4444")
        elif mem.percent > 60:
            self.mem_value.configure(text_color="#eab308")
        else:
            self.mem_value.configure(text_color="#00ff9d")

        self.after(2000, self.update_memory_stats)

    def start_scan_thread(self):
        if not self.api_key and hasattr(self, 'api_entry'):
            self.api_key = self.api_entry.get()
            if not self.api_key:
                messagebox.showerror("Error", "API Key is required for AI Analysis")
                return

        self.scan_btn.configure(state="disabled", text="SCANNING...")
        self.clean_btn.configure(state="disabled")
        self.status_label.configure(text="Gathering process data...")
        
        # Clear previous list
        for widget in self.scroll_frame.winfo_children():
            widget.destroy()

        self.scan_thread = threading.Thread(target=self.perform_scan)
        self.scan_thread.start()

    def perform_scan(self):
        try:
            # 1. Collect Data
            procs = []
            for p in psutil.process_iter(['pid', 'name', 'memory_info']):
                try:
                    p_info = p.info
                    # Filter Critical System Processes Immediately
                    if p_info['name'] in CRITICAL_PROCESSES:
                        continue
                    
                    # Filter very small processes (< 10MB) to save tokens, unless they are suspicious? 
                    # For now keep > 20MB or specifically 'bloaty' names
                    mem_mb = p_info['memory_info'].rss / (1024 * 1024)
                    if mem_mb < 20: 
                        continue

                    procs.append({
                        "name": p_info['name'],
                        "pid": p_info['pid'],
                        "memory_mb": round(mem_mb, 1),
                        "ui_var": None  # Will hold checkbox variable
                    })
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    pass

            # Sort by memory usage
            procs.sort(key=lambda x: x['memory_mb'], reverse=True)
            
            # Limit to top 25 for this demo to ensure speed and token limits
            top_procs = procs[:25]
            
            # 2. AI Analysis
            self.status_label.configure(text="Consulting Gemini AI...")
            analyzed_procs = self.analyze_with_gemini(top_procs)
            
            self.processes = analyzed_procs
            
            # 3. Update UI (must be on main thread)
            self.after(0, self.populate_results)

        except Exception as e:
            print(f"Scan Error: {e}")
            self.status_label.configure(text=f"Error: {str(e)}")
            self.after(0, lambda: self.scan_btn.configure(state="normal", text="START SMART SCAN"))

    def analyze_with_gemini(self, proc_list):
        genai.configure(api_key=self.api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Prepare lightweight list for prompt
        prompt_data = [{"name": p["name"], "memory": f"{p['memory_mb']} MB"} for p in proc_list]
        
        prompt = f"""
        Act as a Windows System Optimization Expert.
        Analyze these processes and identify which are safe to terminate to free RAM.
        
        Strict Rules:
        - System/Kernel/Driver processes = Critical (Safe: False)
        - Browsers/Editors/User Apps = User (Safe: True, but warn about data loss)
        - Background Updaters/Telemetry/Unused Services = Bloatware (Safe: True)
        
        Return ONLY a JSON array with this schema:
        [
            {{
                "name": "process_name.exe",
                "description": "Brief explanation of what it does",
                "category": "System" | "User" | "Bloatware",
                "safe_to_terminate": boolean,
                "risk_level": "Low" | "Medium" | "High"
            }}
        ]
        
        Input Data:
        {json.dumps(prompt_data)}
        """
        
        try:
            response = model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
            analysis = json.loads(response.text)
            
            # Merge analysis back
            for p in proc_list:
                # Find matching analysis
                match = next((item for item in analysis if item["name"] == p["name"]), None)
                if match:
                    p.update(match)
                else:
                    p.update({
                        "description": "Analysis failed", 
                        "category": "Unknown", 
                        "safe_to_terminate": False,
                        "risk_level": "Unknown"
                    })
            return proc_list
            
        except Exception as e:
            print(f"Gemini API Error: {e}")
            # Fallback
            for p in proc_list:
                p.update({"description": "AI Unavailable", "category": "Unknown", "safe_to_terminate": False})
            return proc_list

    def populate_results(self):
        self.scan_btn.configure(state="normal", text="START SMART SCAN")
        self.clean_btn.configure(state="normal")
        self.status_label.configure(text=f"Analysis Complete. Found {len(self.processes)} candidates.")

        for proc in self.processes:
            row = ctk.CTkFrame(self.scroll_frame, fg_color="#2b2b2b")
            row.pack(fill="x", pady=2, padx=5)
            
            # Checkbox
            var = ctk.BooleanVar()
            proc['ui_var'] = var
            
            # Auto-select if safe and bloatware
            if proc.get('safe_to_terminate', False) and proc.get('category') == 'Bloatware':
                var.set(True)

            chk = ctk.CTkCheckBox(
                row, 
                text=f"{proc['name']} ({proc['pid']})", 
                variable=var,
                font=ctk.CTkFont(family="Consolas", size=12),
                width=200
            )
            chk.pack(side="left", padx=10, pady=10)
            
            # Disable checkbox if high risk
            if not proc.get('safe_to_terminate', False):
                chk.configure(state="disabled", text_color="gray")

            # Memory
            mem_lbl = ctk.CTkLabel(row, text=f"{proc['memory_mb']} MB", width=80, anchor="e", text_color="#00f3ff")
            mem_lbl.pack(side="right", padx=10)

            # Details
            desc_text = f"[{proc.get('category', '?')}] {proc.get('description', '')}"
            color = "white"
            if proc.get('risk_level') == 'High': color = "#ef4444"
            elif proc.get('category') == 'Bloatware': color = "#eab308"
            
            desc_lbl = ctk.CTkLabel(row, text=desc_text, anchor="w", text_color=color)
            desc_lbl.pack(side="left", padx=10, fill="x", expand=True)

    def clean_processes(self):
        to_kill = [p for p in self.processes if p['ui_var'].get()]
        if not to_kill:
            return
            
        count = 0
        freed = 0
        
        for p in to_kill:
            try:
                proc = psutil.Process(p['pid'])
                proc.terminate()
                count += 1
                freed += p['memory_mb']
            except Exception as e:
                print(f"Failed to kill {p['name']}: {e}")

        messagebox.showinfo("Optimization Complete", f"Terminated {count} processes.\nFreed approx {freed:.1f} MB RAM.")
        self.start_scan_thread() # Refresh

if __name__ == "__main__":
    app = NeuroClearApp()
    app.mainloop()
`;