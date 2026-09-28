using System;
using System.IO;
using System.Diagnostics;
using System.Windows.Forms;
using System.Drawing;
using System.Runtime.InteropServices;

namespace DnaAiInstaller
{
    public class Program
    {
        private const string APP_NAME = "DNA AI Platform";
        private const string APP_URL = "https://dna-ai-tools-one.vercel.app";

        [STAThread]
        public static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            try
            {
                // 1. Tentukan browser engine terbaik (Edge atau Chrome)
                string browserPath = GetBrowserPath();
                string appDataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "DNA_AI_Platform_Data");
                
                if (!Directory.Exists(appDataDir))
                {
                    Directory.CreateDirectory(appDataDir);
                }

                // Argumen untuk membuka jendela mandiri tanpa address bar
                string launchArgs = string.Format("--app=\"{0}\" --window-size=1366,850 --user-data-dir=\"{1}\"", APP_URL, appDataDir);

                // 2. Buat Shortcut di Desktop dan Start Menu
                string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                string startMenuPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.StartMenu), "Programs");

                CreateShortcut(Path.Combine(desktopPath, APP_NAME + ".lnk"), browserPath, launchArgs, "Aplikasi DNA AI Platform");
                if (Directory.Exists(startMenuPath))
                {
                    CreateShortcut(Path.Combine(startMenuPath, APP_NAME + ".lnk"), browserPath, launchArgs, "Aplikasi DNA AI Platform");
                }

                // 3. Jalankan aplikasi langsung
                if (!string.IsNullOrEmpty(browserPath) && File.Exists(browserPath))
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = browserPath;
                    psi.Arguments = launchArgs;
                    psi.UseShellExecute = true;
                    Process.Start(psi);
                }
                else
                {
                    Process.Start(APP_URL);
                }

                // 4. Beritahu pengguna dengan pesan ramah
                MessageBox.Show(
                    "Pemasangan DNA AI Platform Berhasil!\n\n" +
                    "• Shortcut telah ditambahkan ke Desktop & Start Menu.\n" +
                    "• DNA AI kini terbuka di jendela mandiri tanpa bilah browser.\n\n" +
                    "Selamat menggunakan DNA AI Platform!",
                    "DNA AI Platform - Installer",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );
            }
            catch (Exception ex)
            {
                // Fallback buka langsung di browser bawaan
                try
                {
                    Process.Start(APP_URL);
                }
                catch {}

                MessageBox.Show(
                    "DNA AI Platform sedang dibuka di browser Anda.\n\nDetail: " + ex.Message,
                    "DNA AI Platform",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );
            }
        }

        private static string GetBrowserPath()
        {
            // Cek Microsoft Edge (standar bawaan Windows 10/11)
            string edge = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe");
            if (File.Exists(edge)) return edge;

            edge = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe");
            if (File.Exists(edge)) return edge;

            // Cek Google Chrome
            string chrome = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Google\Chrome\Application\chrome.exe");
            if (File.Exists(chrome)) return chrome;

            chrome = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Google\Chrome\Application\chrome.exe");
            if (File.Exists(chrome)) return chrome;

            string localChrome = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Google\Chrome\Application\chrome.exe");
            if (File.Exists(localChrome)) return localChrome;

            return "msedge.exe";
        }

        private static void CreateShortcut(string shortcutPath, string targetPath, string arguments, string description)
        {
            try
            {
                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType != null)
                {
                    dynamic shell = Activator.CreateInstance(shellType);
                    dynamic shortcut = shell.CreateShortcut(shortcutPath);
                    shortcut.TargetPath = targetPath;
                    shortcut.Arguments = arguments;
                    shortcut.Description = description;
                    shortcut.WorkingDirectory = Path.GetDirectoryName(targetPath);
                    shortcut.Save();
                }
            }
            catch
            {
                // Abaikan jika wscript dibatasi
            }
        }
    }
}
