import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";

interface SignalingMessage {
  type: "offer" | "answer" | "ice-candidate";
  data: any;
  from: string;
  to: string;
  testId: number;
  role: "student" | "teacher";
}

interface StreamSession {
  studentId: string;
  teacherId: string;
  testId: number;
  studentSocketId: string;
  teacherSocketId: string;
  startedAt: Date;
}

@WebSocketGateway({
  cors: {
    origin: "*",
    credentials: true,
  },
  namespace: "/streaming",
})
export class StreamingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(StreamingGateway.name);
  private activeSessions = new Map<string, StreamSession>();
  private userSockets = new Map<string, string>(); // userId -> socketId

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Clean up sessions when client disconnects
    const userId = this.getUserIdBySocketId(client.id);
    if (userId) {
      this.userSockets.delete(userId);
      this.cleanupSessionsBySocketId(client.id);
    }
  }

  @SubscribeMessage("register")
  handleRegister(
    @MessageBody()
    data: { userId: string; role: "student" | "teacher"; testId: number },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`User registered: ${data.userId} as ${data.role} for test ${data.testId}`);

    this.userSockets.set(data.userId, client.id);

    client.join(`test-${data.testId}`);
    client.join(`${data.role}-${data.testId}`);

    client.emit("registered", {
      success: true,
      socketId: client.id,
    });
  }

  @SubscribeMessage("start-stream")
  handleStartStream(
    @MessageBody()
    data: { studentId: string; teacherId: string; testId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const sessionKey = `${data.testId}-${data.studentId}-${data.teacherId}`;

    const session: StreamSession = {
      studentId: data.studentId,
      teacherId: data.teacherId,
      testId: data.testId,
      studentSocketId: this.userSockets.get(data.studentId) || "",
      teacherSocketId: this.userSockets.get(data.teacherId) || "",
      startedAt: new Date(),
    };

    this.activeSessions.set(sessionKey, session);

    this.logger.log(`Stream session started: ${sessionKey}`);

    // Notify student to start streaming
    const studentSocketId = this.userSockets.get(data.studentId);
    if (studentSocketId) {
      this.server.to(studentSocketId).emit("stream-request", {
        teacherId: data.teacherId,
        testId: data.testId,
      });
    }

    client.emit("stream-started", { success: true, sessionKey });
  }

  @SubscribeMessage("signal")
  handleSignal(@MessageBody() message: SignalingMessage, @ConnectedSocket() client: Socket) {
    this.logger.log(`Signal from ${message.from} to ${message.to}: ${message.type}`);

    const targetSocketId = this.userSockets.get(message.to);

    if (targetSocketId) {
      this.server.to(targetSocketId).emit("signal", {
        type: message.type,
        data: message.data,
        from: message.from,
      });
    } else {
      this.logger.warn(`Target user ${message.to} not found`);
      client.emit("signal-error", {
        error: "Target user not connected",
        to: message.to,
      });
    }
  }

  @SubscribeMessage("stop-stream")
  handleStopStream(
    @MessageBody()
    data: { studentId: string; teacherId: string; testId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const sessionKey = `${data.testId}-${data.studentId}-${data.teacherId}`;

    this.activeSessions.delete(sessionKey);

    this.logger.log(`Stream session stopped: ${sessionKey}`);

    // Notify both parties
    const studentSocketId = this.userSockets.get(data.studentId);
    const teacherSocketId = this.userSockets.get(data.teacherId);

    if (studentSocketId) {
      this.server.to(studentSocketId).emit("stream-stopped", {
        teacherId: data.teacherId,
      });
    }

    if (teacherSocketId) {
      this.server.to(teacherSocketId).emit("stream-stopped", {
        studentId: data.studentId,
      });
    }

    client.emit("stream-stopped", { success: true });
  }

  @SubscribeMessage("get-active-sessions")
  handleGetActiveSessions(
    @MessageBody() data: { testId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const sessions = Array.from(this.activeSessions.values()).filter(
      (session) => session.testId === data.testId,
    );

    client.emit("active-sessions", { sessions });
  }

  private getUserIdBySocketId(socketId: string): string | undefined {
    for (const [userId, sid] of this.userSockets.entries()) {
      if (sid === socketId) {
        return userId;
      }
    }
    return undefined;
  }

  private cleanupSessionsBySocketId(socketId: string) {
    const sessionsToDelete: string[] = [];

    for (const [key, session] of this.activeSessions.entries()) {
      if (session.studentSocketId === socketId || session.teacherSocketId === socketId) {
        sessionsToDelete.push(key);

        // Notify the other party
        const otherSocketId =
          session.studentSocketId === socketId ? session.teacherSocketId : session.studentSocketId;

        if (otherSocketId) {
          this.server.to(otherSocketId).emit("stream-stopped", {
            reason: "peer-disconnected",
          });
        }
      }
    }

    sessionsToDelete.forEach((key) => this.activeSessions.delete(key));
  }
}
