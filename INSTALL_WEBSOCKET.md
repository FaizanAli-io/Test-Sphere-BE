# WebSocket Dependencies Installation

## Required Packages

Run the following command in the `Test-Sphere-BE` directory:

```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
```

## What These Packages Do

- `@nestjs/websockets` - NestJS WebSocket support
- `@nestjs/platform-socket.io` - Socket.IO adapter for NestJS
- `socket.io` - WebSocket library for real-time communication

## After Installation

Restart your backend server:

```bash
npm run start:dev
```

The WebSocket server will be available at:

```
ws://localhost:5000/streaming
```
