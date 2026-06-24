# ================================
# CONFIGURATION
# ================================
$ip = "192.168.1.217"          # Your server IP
$serverCertName = "DevServerCert"

Write-Host "=== Creating Self Signed Certificate ==="

$serverCert = New-SelfSignedCertificate `
    -DnsName $ip `
    -CertStoreLocation "cert:\LocalMachine\My" `
    -FriendlyName $serverCertName `
    -KeyLength 2048 `
    -KeyExportPolicy Exportable `
    -NotAfter (Get-Date).AddYears(1)

Write-Host "=== DONE ==="
Read-Host "press any to exit"
