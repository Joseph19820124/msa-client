#!/bin/bash

# SSL Certificate Generation Script for Production Deployment
# This script generates self-signed certificates for development/testing
# For production, use certificates from a trusted CA like Let's Encrypt

set -e

# Configuration
CERT_DIR="./ssl/certs"
KEY_SIZE=2048
DAYS=365
COUNTRY="US"
STATE="CA"
CITY="San Francisco"
ORGANIZATION="MSA Blog Platform"
ORGANIZATIONAL_UNIT="IT Department"
COMMON_NAME="localhost"
EMAIL="admin@example.com"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if OpenSSL is installed
check_dependencies() {
    print_info "Checking dependencies..."
    
    if ! command -v openssl &> /dev/null; then
        print_error "OpenSSL is not installed. Please install OpenSSL first."
        exit 1
    fi
    
    print_info "OpenSSL found: $(openssl version)"
}

# Create certificate directory
create_cert_directory() {
    print_info "Creating certificate directory..."
    
    mkdir -p "$CERT_DIR"
    chmod 700 "$CERT_DIR"
    
    print_info "Certificate directory created: $CERT_DIR"
}

# Generate private key
generate_private_key() {
    print_info "Generating private key..."
    
    openssl genrsa -out "$CERT_DIR/server.key" $KEY_SIZE
    chmod 600 "$CERT_DIR/server.key"
    
    print_info "Private key generated: $CERT_DIR/server.key"
}

# Generate certificate signing request
generate_csr() {
    print_info "Generating certificate signing request..."
    
    openssl req -new \
        -key "$CERT_DIR/server.key" \
        -out "$CERT_DIR/server.csr" \
        -subj "/C=$COUNTRY/ST=$STATE/L=$CITY/O=$ORGANIZATION/OU=$ORGANIZATIONAL_UNIT/CN=$COMMON_NAME/emailAddress=$EMAIL"
    
    print_info "CSR generated: $CERT_DIR/server.csr"
}

# Generate self-signed certificate
generate_certificate() {
    print_info "Generating self-signed certificate..."
    
    # Create config file for SAN (Subject Alternative Names)
    cat > "$CERT_DIR/server.conf" <<EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = $COUNTRY
ST = $STATE
L = $CITY
O = $ORGANIZATION
OU = $ORGANIZATIONAL_UNIT
CN = $COMMON_NAME

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
DNS.3 = api-gateway
DNS.4 = *.api-gateway
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

    openssl x509 -req \
        -in "$CERT_DIR/server.csr" \
        -signkey "$CERT_DIR/server.key" \
        -out "$CERT_DIR/server.crt" \
        -days $DAYS \
        -extensions v3_req \
        -extfile "$CERT_DIR/server.conf"
    
    chmod 644 "$CERT_DIR/server.crt"
    
    print_info "Certificate generated: $CERT_DIR/server.crt"
}

# Generate Diffie-Hellman parameters
generate_dhparam() {
    print_info "Generating Diffie-Hellman parameters (this may take a while)..."
    
    openssl dhparam -out "$CERT_DIR/dhparam.pem" 2048
    chmod 644 "$CERT_DIR/dhparam.pem"
    
    print_info "DH parameters generated: $CERT_DIR/dhparam.pem"
}

# Create certificate bundle
create_bundle() {
    print_info "Creating certificate bundle..."
    
    cat "$CERT_DIR/server.crt" "$CERT_DIR/dhparam.pem" > "$CERT_DIR/server-bundle.crt"
    chmod 644 "$CERT_DIR/server-bundle.crt"
    
    print_info "Certificate bundle created: $CERT_DIR/server-bundle.crt"
}

# Verify certificate
verify_certificate() {
    print_info "Verifying certificate..."
    
    # Check certificate validity
    openssl x509 -in "$CERT_DIR/server.crt" -text -noout > "$CERT_DIR/cert-info.txt"
    
    # Verify private key matches certificate
    if openssl x509 -noout -modulus -in "$CERT_DIR/server.crt" | openssl md5 | \
       diff - <(openssl rsa -noout -modulus -in "$CERT_DIR/server.key" | openssl md5) > /dev/null; then
        print_info "Certificate and private key match"
    else
        print_error "Certificate and private key do not match!"
        exit 1
    fi
    
    print_info "Certificate verification completed"
}

# Set proper permissions
set_permissions() {
    print_info "Setting proper file permissions..."
    
    # Private key should be readable only by owner
    chmod 600 "$CERT_DIR/server.key"
    
    # Certificates can be readable by group
    chmod 644 "$CERT_DIR/server.crt"
    chmod 644 "$CERT_DIR/server-bundle.crt"
    chmod 644 "$CERT_DIR/dhparam.pem"
    
    # Config and info files
    chmod 644 "$CERT_DIR/server.conf"
    chmod 644 "$CERT_DIR/cert-info.txt"
    
    # CSR can be removed or kept for reference
    chmod 644 "$CERT_DIR/server.csr"
    
    print_info "File permissions set"
}

# Display certificate information
display_certificate_info() {
    print_info "Certificate Information:"
    echo "=========================="
    
    echo "Subject: $(openssl x509 -noout -subject -in "$CERT_DIR/server.crt" | sed 's/subject=//')"
    echo "Issuer: $(openssl x509 -noout -issuer -in "$CERT_DIR/server.crt" | sed 's/issuer=//')"
    echo "Valid from: $(openssl x509 -noout -startdate -in "$CERT_DIR/server.crt" | sed 's/notBefore=//')"
    echo "Valid until: $(openssl x509 -noout -enddate -in "$CERT_DIR/server.crt" | sed 's/notAfter=//')"
    echo "Serial number: $(openssl x509 -noout -serial -in "$CERT_DIR/server.crt" | sed 's/serial=//')"
    echo "Fingerprint: $(openssl x509 -noout -fingerprint -sha256 -in "$CERT_DIR/server.crt" | sed 's/SHA256 Fingerprint=//')"
    
    echo ""
    print_info "Certificate files created:"
    ls -la "$CERT_DIR/"
}

# Production certificate instructions
show_production_instructions() {
    print_warning "IMPORTANT: These are self-signed certificates for development only!"
    echo ""
    echo "For production deployment:"
    echo "1. Use certificates from a trusted Certificate Authority (CA)"
    echo "2. Consider using Let's Encrypt for free SSL certificates"
    echo "3. Use tools like certbot for automatic certificate renewal"
    echo ""
    echo "Let's Encrypt example:"
    echo "  certbot certonly --webroot -w /var/www/html -d yourdomain.com"
    echo ""
    echo "Or use DNS challenge:"
    echo "  certbot certonly --dns-cloudflare -d yourdomain.com"
}

# Main execution
main() {
    print_info "Starting SSL certificate generation..."
    
    check_dependencies
    create_cert_directory
    generate_private_key
    generate_csr
    generate_certificate
    generate_dhparam
    create_bundle
    verify_certificate
    set_permissions
    display_certificate_info
    show_production_instructions
    
    print_info "SSL certificate generation completed successfully!"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --domain)
            COMMON_NAME="$2"
            shift 2
            ;;
        --country)
            COUNTRY="$2"
            shift 2
            ;;
        --state)
            STATE="$2"
            shift 2
            ;;
        --city)
            CITY="$2"
            shift 2
            ;;
        --org)
            ORGANIZATION="$2"
            shift 2
            ;;
        --email)
            EMAIL="$2"
            shift 2
            ;;
        --days)
            DAYS="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --domain DOMAIN    Common name for certificate (default: localhost)"
            echo "  --country CODE     Country code (default: US)"
            echo "  --state STATE      State name (default: CA)"
            echo "  --city CITY        City name (default: San Francisco)"
            echo "  --org ORG          Organization name (default: MSA Blog Platform)"
            echo "  --email EMAIL      Email address (default: admin@example.com)"
            echo "  --days DAYS        Certificate validity in days (default: 365)"
            echo "  --help             Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Run main function
main