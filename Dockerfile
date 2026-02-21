FROM node:20

# Install system deps
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    && pip3 install yt-dlp openai-whisper \
    && apt-get clean

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

# Start app
CMD ["node", "index.js"]
