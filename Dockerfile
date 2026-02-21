# Use full Debian Node image (not alpine)
FROM node:20-bullseye

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-venv \
    python3-pip \
    curl \
    && apt-get clean

# Create virtual environment to bypass PEP 668
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install yt-dlp inside virtual environment
RUN pip install --upgrade pip
RUN pip install yt-dlp

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install node deps
RUN npm install

# Copy app files
COPY . .

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "index.js"]
