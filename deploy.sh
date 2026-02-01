#!/bin/bash

# Skillora Deployment Script
# This script handles the complete deployment process for the Skillora platform

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="skillora"
BACKEND_DIR="backend"
FRONTEND_DIR="frontend"
DEPLOY_ENV=${1:-production}

echo -e "${BLUE}🚀 Starting Skillora Deployment for ${DEPLOY_ENV} environment${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if required tools are installed
check_requirements() {
    echo -e "${BLUE}📋 Checking requirements...${NC}"
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is required but not installed"
        exit 1
    fi
    print_status "Python 3 found: $(python3 --version)"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is required but not installed"
        exit 1
    fi
    print_status "Node.js found: $(node --version)"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is required but not installed"
        exit 1
    fi
    print_status "npm found: $(npm --version)"
    
    # Check Git
    if ! command -v git &> /dev/null; then
        print_error "Git is required but not installed"
        exit 1
    fi
    print_status "Git found: $(git --version)"
    
    # Check PostgreSQL (for production)
    if [ "$DEPLOY_ENV" = "production" ]; then
        if ! command -v psql &> /dev/null; then
            print_warning "PostgreSQL client not found. Make sure PostgreSQL is available."
        else
            print_status "PostgreSQL client found: $(psql --version)"
        fi
    fi
}

# Setup environment variables
setup_environment() {
    echo -e "${BLUE}🔧 Setting up environment...${NC}"
    
    if [ "$DEPLOY_ENV" = "production" ]; then
        if [ ! -f "${BACKEND_DIR}/.env.production" ]; then
            print_warning "Production environment file not found. Creating template..."
            cat > "${BACKEND_DIR}/.env.production" << EOF
# Production Environment Variables
DEBUG=False
SECRET_KEY=your-super-secret-key-here-$(openssl rand -hex 32)
ALLOWED_HOSTS=your-domain.com,www.your-domain.com

# Database
DB_NAME=skillora_prod
DB_USER=skillora_user
DB_PASSWORD=$(openssl rand -base64 32)
DB_HOST=localhost
DB_PORT=5432

# Redis
REDIS_URL=redis://127.0.0.1:6379/1

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=noreply@your-domain.com

# AWS S3 (Optional)
USE_S3=True
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_STORAGE_BUCKET_NAME=your-bucket-name
AWS_S3_REGION_NAME=us-east-1

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-key
STRIPE_SECRET_KEY=sk_live_your-stripe-secret

# Celery
CELERY_BROKER_URL=redis://127.0.0.1:6379/0
CELERY_RESULT_BACKEND=redis://127.0.0.1:6379/0

# Admin
ADMIN_URL=secure-admin-url-$(openssl rand -hex 8)/

# Backup
BACKUP_ENABLED=True
BACKUP_S3_BUCKET=your-backup-bucket

# Frontend
FRONTEND_URL=https://your-domain.com
EOF
            print_warning "Please update ${BACKEND_DIR}/.env.production with your actual values"
            read -p "Press Enter to continue after updating the environment file..."
        fi
        
        # Copy production environment file
        cp "${BACKEND_DIR}/.env.production" "${BACKEND_DIR}/.env"
        print_status "Production environment configured"
    else
        print_status "Development environment configured"
    fi
}

# Install backend dependencies
install_backend_deps() {
    echo -e "${BLUE}📦 Installing backend dependencies...${NC}"
    
    cd $BACKEND_DIR
    
    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        python3 -m venv venv
        print_status "Virtual environment created"
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Upgrade pip
    pip install --upgrade pip
    
    # Install dependencies
    pip install -r requirements.txt
    print_status "Backend dependencies installed"
    
    cd ..
}

# Install frontend dependencies
install_frontend_deps() {
    echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
    
    cd $FRONTEND_DIR
    
    # Clean install
    if [ -d "node_modules" ]; then
        rm -rf node_modules
    fi
    
    npm ci
    print_status "Frontend dependencies installed"
    
    cd ..
}

# Run backend tests
run_backend_tests() {
    echo -e "${BLUE}🧪 Running backend tests...${NC}"
    
    cd $BACKEND_DIR
    source venv/bin/activate
    
    # Run Django system checks
    python manage.py check --deploy
    print_status "Django system checks passed"
    
    # Run migrations check
    python manage.py makemigrations --check --dry-run
    print_status "Migration checks passed"
    
    # Run Django tests
    python manage.py test --verbosity=2 --keepdb
    print_status "Backend tests passed"
    
    cd ..
}

# Run frontend tests
run_frontend_tests() {
    echo -e "${BLUE}🧪 Running frontend tests...${NC}"
    
    cd $FRONTEND_DIR
    
    # Run linting
    npm run lint --if-present
    print_status "Frontend linting passed"
    
    # Run tests
    CI=true npm test -- --coverage --watchAll=false
    print_status "Frontend tests passed"
    
    cd ..
}

# Build frontend for production
build_frontend() {
    echo -e "${BLUE}🏗️ Building frontend...${NC}"
    
    cd $FRONTEND_DIR
    
    # Create production build
    npm run build
    print_status "Frontend built successfully"
    
    # Verify build
    if [ ! -d "build" ] || [ ! -f "build/index.html" ]; then
        print_error "Frontend build failed - build directory or index.html not found"
        exit 1
    fi
    
    print_status "Frontend build verified"
    
    cd ..
}

# Setup database
setup_database() {
    echo -e "${BLUE}🗄️ Setting up database...${NC}"
    
    cd $BACKEND_DIR
    source venv/bin/activate
    
    # Create migrations
    python manage.py makemigrations
    print_status "Migrations created"
    
    # Run migrations
    python manage.py migrate
    print_status "Database migrations completed"
    
    # Collect static files for production
    if [ "$DEPLOY_ENV" = "production" ]; then
        python manage.py collectstatic --noinput
        print_status "Static files collected"
    fi
    
    cd ..
}

# Create superuser (interactive)
create_superuser() {
    echo -e "${BLUE}👤 Creating superuser...${NC}"
    
    cd $BACKEND_DIR
    source venv/bin/activate
    
    echo "Please create an admin user for the platform:"
    python manage.py createsuperuser
    print_status "Superuser created"
    
    cd ..
}

# Setup systemd services (production only)
setup_systemd_services() {
    if [ "$DEPLOY_ENV" != "production" ]; then
        return
    fi
    
    echo -e "${BLUE}⚙️ Setting up systemd services...${NC}"
    
    # Create Gunicorn service
    sudo tee /etc/systemd/system/skillora-gunicorn.service > /dev/null << EOF
[Unit]
Description=Skillora Gunicorn daemon
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=$(pwd)/$BACKEND_DIR
Environment="PATH=$(pwd)/$BACKEND_DIR/venv/bin"
ExecStart=$(pwd)/$BACKEND_DIR/venv/bin/gunicorn --workers 3 --bind unix:$(pwd)/$BACKEND_DIR/skillora.sock skillora.wsgi:application
ExecReload=/bin/kill -s HUP \$MAINPID
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
    
    # Create Celery service
    sudo tee /etc/systemd/system/skillora-celery.service > /dev/null << EOF
[Unit]
Description=Skillora Celery daemon
After=network.target

[Service]
Type=forking
User=www-data
Group=www-data
WorkingDirectory=$(pwd)/$BACKEND_DIR
Environment="PATH=$(pwd)/$BACKEND_DIR/venv/bin"
ExecStart=$(pwd)/$BACKEND_DIR/venv/bin/celery multi start worker1 -A skillora --pidfile=/var/run/celery/%n.pid --logfile=/var/log/celery/%n%I.log --loglevel=INFO
ExecStop=$(pwd)/$BACKEND_DIR/venv/bin/celery multi stopwait worker1 --pidfile=/var/run/celery/%n.pid
ExecReload=$(pwd)/$BACKEND_DIR/venv/bin/celery multi restart worker1 -A skillora --pidfile=/var/run/celery/%n.pid --logfile=/var/log/celery/%n%I.log --loglevel=INFO
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    # Create directories for Celery
    sudo mkdir -p /var/run/celery /var/log/celery
    sudo chown www-data:www-data /var/run/celery /var/log/celery
    
    # Create log directories
    sudo mkdir -p /var/log/skillora
    sudo chown www-data:www-data /var/log/skillora
    
    # Reload systemd and enable services
    sudo systemctl daemon-reload
    sudo systemctl enable skillora-gunicorn
    sudo systemctl enable skillora-celery
    
    print_status "Systemd services configured"
}

# Setup Nginx (production only)
setup_nginx() {
    if [ "$DEPLOY_ENV" != "production" ]; then
        return
    fi
    
    echo -e "${BLUE}🌐 Setting up Nginx...${NC}"
    
    # Create Nginx configuration
    sudo tee /etc/nginx/sites-available/skillora > /dev/null << EOF
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL Configuration (update with your certificate paths)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone \$binary_remote_addr zone=login:10m rate=5r/m;
    
    # Frontend (React build)
    location / {
        root $(pwd)/$FRONTEND_DIR/build;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Backend API
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://unix:$(pwd)/$BACKEND_DIR/skillora.sock;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Increase timeout for long-running requests
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Auth endpoints with stricter rate limiting
    location /api/auth/login/ {
        limit_req zone=login burst=5 nodelay;
        
        proxy_pass http://unix:$(pwd)/$BACKEND_DIR/skillora.sock;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Health check endpoints
    location /health {
        proxy_pass http://unix:$(pwd)/$BACKEND_DIR/skillora.sock;
        access_log off;
    }
    
    # Admin interface
    location /secure-admin-url/ {
        proxy_pass http://unix:$(pwd)/$BACKEND_DIR/skillora.sock;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Additional security for admin
        allow your-ip-address;
        deny all;
    }
    
    # Static files
    location /static/ {
        alias $(pwd)/$BACKEND_DIR/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Media files
    location /media/ {
        alias $(pwd)/$BACKEND_DIR/media/;
        expires 1y;
        add_header Cache-Control "public";
    }
    
    # Security
    location ~ /\. {
        deny all;
    }
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
EOF
    
    # Enable site
    sudo ln -sf /etc/nginx/sites-available/skillora /etc/nginx/sites-enabled/
    
    # Remove default site
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test Nginx configuration
    sudo nginx -t
    
    print_status "Nginx configured"
}

# Start services
start_services() {
    echo -e "${BLUE}🚀 Starting services...${NC}"
    
    if [ "$DEPLOY_ENV" = "production" ]; then
        # Start systemd services
        sudo systemctl start skillora-gunicorn
        sudo systemctl start skillora-celery
        sudo systemctl reload nginx
        
        print_status "Production services started"
    else
        # Development mode
        echo -e "${YELLOW}Development mode - start services manually:${NC}"
        echo "Backend: cd $BACKEND_DIR && source venv/bin/activate && python manage.py runserver"
        echo "Frontend: cd $FRONTEND_DIR && npm start"
        echo "Celery: cd $BACKEND_DIR && source venv/bin/activate && celery -A skillora worker -l info"
    fi
}

# Health check
health_check() {
    echo -e "${BLUE}🏥 Running health check...${NC}"
    
    if [ "$DEPLOY_ENV" = "production" ]; then
        # Check if services are running
        if systemctl is-active --quiet skillora-gunicorn; then
            print_status "Gunicorn service is running"
        else
            print_error "Gunicorn service is not running"
            sudo systemctl status skillora-gunicorn --no-pager
        fi
        
        if systemctl is-active --quiet skillora-celery; then
            print_status "Celery service is running"
        else
            print_error "Celery service is not running"
            sudo systemctl status skillora-celery --no-pager
        fi
        
        if systemctl is-active --quiet nginx; then
            print_status "Nginx service is running"
        else
            print_error "Nginx service is not running"
            sudo systemctl status nginx --no-pager
        fi
        
        # Test health endpoint
        sleep 5  # Give services time to start
        if curl -f http://localhost/health/ > /dev/null 2>&1; then
            print_status "Health endpoint responding"
        else
            print_warning "Health endpoint not responding"
        fi
    fi
    
    # Test database connection
    cd $BACKEND_DIR
    source venv/bin/activate
    python manage.py check --deploy
    print_status "Django deployment check passed"
    cd ..
}

# Backup database
backup_database() {
    if [ "$DEPLOY_ENV" = "production" ]; then
        echo -e "${BLUE}💾 Creating database backup...${NC}"
        
        cd $BACKEND_DIR
        source venv/bin/activate
        
        mkdir -p backups
        BACKUP_FILE="backups/backup_$(date +%Y%m%d_%H%M%S).json"
        python manage.py dumpdata --natural-foreign --natural-primary > "$BACKUP_FILE"
        
        # Compress backup
        gzip "$BACKUP_FILE"
        
        print_status "Database backup created: ${BACKUP_FILE}.gz"
        cd ..
    fi
}

# Setup SSL certificates
setup_ssl() {
    if [ "$DEPLOY_ENV" != "production" ]; then
        return
    fi
    
    echo -e "${BLUE}🔒 Setting up SSL certificates...${NC}"
    
    # Check if certbot is installed
    if ! command -v certbot &> /dev/null; then
        print_warning "Certbot not found. Installing..."
        sudo apt-get update
        sudo apt-get install -y certbot python3-certbot-nginx
    fi
    
    print_warning "Please update your domain name in the Nginx configuration before running:"
    echo "sudo certbot --nginx -d your-domain.com -d www.your-domain.com"
    
    read -p "Do you want to run certbot now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter your domain name: " domain_name
        sudo certbot --nginx -d "$domain_name" -d "www.$domain_name"
        print_status "SSL certificates configured"
    fi
}

# Main deployment function
main() {
    echo -e "${BLUE}🎯 Skillora Deployment Script${NC}"
    echo -e "${BLUE}Environment: ${DEPLOY_ENV}${NC}"
    echo ""
    
    # Create backup directory
    mkdir -p $BACKEND_DIR/backups
    
    # Run deployment steps
    check_requirements
    setup_environment
    
    if [ "$DEPLOY_ENV" = "production" ]; then
        backup_database
    fi
    
    install_backend_deps
    install_frontend_deps
    
    # Run tests (optional - comment out for faster deployment)
    read -p "Do you want to run tests? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        run_backend_tests
        run_frontend_tests
    fi
    
    if [ "$DEPLOY_ENV" = "production" ]; then
        build_frontend
    fi
    
    setup_database
    
    # Create superuser (only if needed)
    read -p "Do you want to create a superuser? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        create_superuser
    fi
    
    if [ "$DEPLOY_ENV" = "production" ]; then
        setup_systemd_services
        setup_nginx
        setup_ssl
    fi
    
    start_services
    health_check
    
    echo ""
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    
    if [ "$DEPLOY_ENV" = "production" ]; then
        echo -e "${YELLOW}📝 Post-deployment checklist:${NC}"
        echo "1. Update your domain name in Nginx configuration"
        echo "2. Configure SSL certificates with Let's Encrypt"
        echo "3. Update DNS records to point to your server"
        echo "4. Configure firewall (UFW recommended)"
        echo "5. Set up monitoring and logging"
        echo "6. Configure automated backups"
        echo "7. Test all functionality"
        echo ""
        echo -e "${BLUE}🔗 Your application should be available at: https://your-domain.com${NC}"
        echo -e "${BLUE}🔧 Health check: https://your-domain.com/health/${NC}"
    else
        echo -e "${BLUE}🔗 Development server will be available at:${NC}"
        echo "Frontend: http://localhost:3000"
        echo "Backend: http://localhost:8000"
        echo "Admin: http://localhost:8000/admin/"
        echo "Health: http://localhost:8000/health/"
    fi
}

# Handle script interruption
trap 'echo -e "\n${RED}Deployment interrupted!${NC}"; exit 1' INT TERM

# Run main function
main