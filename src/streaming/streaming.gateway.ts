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

interface RegisterData {
  userId: string;
  role: "student" | "teacher";
  testId: number;
}

interface SignalData {
  type: "offer" | "answer" | "ice-candidate";
  data: any;
  from: string;
  to: string;
  testId: number;
  role: "student" | "teacher";
}

interface StreamRequest {
  studentId: string;
  teacherId: string;
  testId: number;
  streamType?: "webcam" | "screen";
}

interface StreamSession {
  studentId: string;
  teacherId: string;
  testId: number;
  studentSocketId: string;
  teacherSocketId: string;
  streamType: "webcam" | "screen";
  startedAt: Date;
}

@WebSocketGateway({
  namespace: "/streaming",
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
})
export class StreamingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(StreamingGateway.name);
  private activeSessions = new Map<string, StreamSession>();
  private connectedUsers = new Map<
    string,
    { socketId: string; role: "student" | "teacher"; testId: number }
  >();
  private socketToUser = new Map<string, string>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const userId = this.socketToUser.get(client.id);
    if (userId) {
      this.connectedUsers.delete(userId);
      this.socketToUser.delete(client.id);
      this.logger.log(`User disconnected: ${userId} (${client.id})`);
    } else {
      this.logger.log(`Client disconnected (unregistered): ${client.id}`);
    }
    this.cleanupSessionsBySocketId(client.id);
  }

  @SubscribeMessage("register")
  handleRegister(@MessageBody() data: RegisterData, @ConnectedSocket() client: Socket) {
    const { userId, role, testId } = data;
    this.connectedUsers.set(userId, { socketId: client.id, role, testId });
    this.socketToUser.set(client.id, userId);
    this.logger.log(`Registered: ${userId} as ${role} for test ${testId} (${client.id})`);
    client.join(`test-${testId}`);
    client.join(`${role}-${testId}`);
    client.emit("registered", { success: true, socketId: client.id });
  }

  @SubscribeMessage("start-stream")
  handleStartStream(@MessageBody() data: StreamRequest, @ConnectedSocket() client: Socket) {
    const { studentId, teacherId, testId, streamType = "webcam" } = data;
    this.logger.log(
      `Stream request from teacher ${teacherId} to student ${studentId} for test ${testId} (type: ${streamType})`,
    );
    const studentUser = this.connectedUsers.get(studentId);
    if (studentUser) {
      const sessionKey = `${testId}-${studentId}-${teacherId}`;
      this.activeSessions.set(sessionKey, {
        studentId,
        teacherId,
        testId,
        studentSocketId: studentUser.socketId,
        teacherSocketId: client.id,
        streamType,
        startedAt: new Date(),
      });
      this.server
        .to(studentUser.socketId)
        .emit("stream-request", { teacherId, testId, streamType });
      this.logger.log(
        `Stream request (${streamType}) sent to student ${studentId} at ${studentUser.socketId}`,
      );
      client.emit("stream-started", { success: true, sessionKey, streamType });
    } else {
      this.logger.warn(`Student ${studentId} not connected for stream request`);
      client.emit("error", { message: `Student ${studentId} is not connected` });
    }
  }

  @SubscribeMessage("signal")
  handleSignal(@MessageBody() data: SignalData, @ConnectedSocket() client: Socket) {
    const { type, data: signalData, from, to, testId, role } = data;
    this.logger.log(`Signal ${type} from ${from} (${role}) to ${to} for test ${testId}`);
    const targetUser = this.connectedUsers.get(to);
    if (targetUser) {
      this.server.to(targetUser.socketId).emit("signal", { type, data: signalData, from, testId });
      this.logger.log(`Signal sent to ${to} at ${targetUser.socketId}`);
    } else {
      this.logger.warn(`Target user ${to} not found for signal`);
      client.emit("error", { message: `Target user ${to} is not connected` });
    }
  }

  @SubscribeMessage("stop-stream")
  handleStopStream(@MessageBody() data: StreamRequest, @ConnectedSocket() client: Socket) {
    const { studentId, teacherId, testId } = data;
    const sessionKey = `${testId}-${studentId}-${teacherId}`;
    this.activeSessions.delete(sessionKey);
    this.logger.log(
      `Stop stream from teacher ${teacherId} to student ${studentId} for test ${testId}`,
    );
    const studentUser = this.connectedUsers.get(studentId);
    if (studentUser) {
      this.server.to(studentUser.socketId).emit("stream-stopped", { teacherId, testId });
      this.logger.log(`Stop stream sent to student ${studentId} at ${studentUser.socketId}`);
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
