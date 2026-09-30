$base64 = Get-Content 'scripts\ico-base64.txt' -Raw
$base64 = $base64.Trim()

$csCode = @"
using System;
using System.IO;
using System.Diagnostics;
using System.Windows.Forms;
using System.Drawing;

namespace DnaAiInstaller
{
    public class Program
    {
        private const string APP_NAME = "DNA AI Platform";
        private const string APP_URL = "https://dna-ai-tools-one.vercel.app";
        private const string ICON_BASE64 = "$base64";

        [STAThread]
        public static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            try
            {
                string browserPath = GetBrowserPath();
                string appDataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "DNA_AI_Platform_Data");
                
                if (!Directory.Exists(appDataDir))
                {
                    Directory.CreateDirectory(appDataDir);
                }

                // 1. Ekstrak icon resmi DNA AI ke disk lokal
                string iconPath = Path.Combine(appDataDir, "dna-ai.ico");
                try
                {
                    byte[] iconBytes = Convert.FromBase64String(ICON_BASE64);
                    File.WriteAllBytes(iconPath, iconBytes);
                }
                catch {}

                // Argumen untuk membuka jendela mandiri terhubung dengan profil akun pengguna
                string launchArgs = string.Format("--app=\"{0}\"", APP_URL);

                // 2. Buat Shortcut di Desktop dan Start Menu dengan ICON RESMI DNA AI
                string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                string startMenuPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.StartMenu), "Programs");

                CreateShortcut(Path.Combine(desktopPath, APP_NAME + ".lnk"), browserPath, launchArgs, "Aplikasi DNA AI Platform", iconPath);
                if (Directory.Exists(startMenuPath))
                {
                    CreateShortcut(Path.Combine(startMenuPath, APP_NAME + ".lnk"), browserPath, launchArgs, "Aplikasi DNA AI Platform", iconPath);
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

                MessageBox.Show(
                    "Pemasangan DNA AI Platform Berhasil!\n\n" +
                    "• Icon resmi DNA AI telah dipasang di Desktop & Start Menu.\n" +
                    "• DNA AI kini terbuka di jendela mandiri tanpa bilah browser.\n\n" +
                    "Selamat menggunakan DNA AI Platform!",
                    "DNA AI Platform - Installer",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );
            }
            catch (Exception ex)
            {
                try { Process.Start(APP_URL); } catch {}
                MessageBox.Show("Membuka DNA AI di browser Anda.\n\n" + ex.Message, "DNA AI Platform", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
        }

        private static string GetBrowserPath()
        {
            string chrome = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Google\Chrome\Application\chrome.exe");
            if (File.Exists(chrome)) return chrome;

            chrome = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Google\Chrome\Application\chrome.exe");
            if (File.Exists(chrome)) return chrome;

            string localChrome = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Google\Chrome\Application\chrome.exe");
            if (File.Exists(localChrome)) return localChrome;

            string edge = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe");
            if (File.Exists(edge)) return edge;

            edge = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe");
            if (File.Exists(edge)) return edge;

            return "chrome.exe";
        }

        private static void CreateShortcut(string shortcutPath, string targetPath, string arguments, string description, string iconPath)
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
                    
                    if (File.Exists(iconPath))
                    {
                        shortcut.IconLocation = iconPath + ",0";
                    }
                    
                    shortcut.Save();
                }
            }
            catch {}
        }
    }
}
"@

Set-Content -Path 'scripts\Installer.cs' -Value $csCode

Write-Output "Compiling with win32icon..."
& 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe' /target:winexe /win32icon:scripts\app.ico /out:public\dna-ai-setup.exe /reference:System.Windows.Forms.dll,System.Drawing.dll,Microsoft.CSharp.dll scripts\Installer.cs

Write-Output "Result size: $((Get-Item public\dna-ai-setup.exe).Length) bytes"
