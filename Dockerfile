# Use Node.js environment
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose the port HF Spaces expects
EXPOSE 7860

# Start the application
# We use the 'start' script which runs 'vite --port 7860 --host'
# This allows the app to pick up the API_KEY from the runtime environment variables
CMD ["npm", "run", "start"]