import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import JSZip = require('jszip');
import type { Response } from 'express';

@Injectable()
export class DownloadService {
  constructor(private readonly prisma: PrismaService) {}

  async downloadTestResults(userId: number, testId: number, res: Response) {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: {
        class: true,
        questions: {
          include: {
            answerMarks: {
              include: {
                student: true,
              },
            },
          },
        },
      },
    });

    const submissions = await this.prisma.testSubmission.findMany({
      where: { testId },
      include: {
        user: true,
      },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    // Check if user is the teacher of this test
    if (test.class?.teacherId !== userId) {
      throw new ForbiddenException(
        'Only the test creator can download results',
      );
    }

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Test Results');

    // Add headers
    const headers = [
      'Student Name',
      'Student Email',
      'Total Marks',
      'Obtained Marks',
      'Percentage',
      'Status',
    ];
    test.questions.forEach((q, index) => {
      headers.push(`Q${index + 1} (${q.marks} marks)`);
    });

    worksheet.addRow(headers);

    // Style headers
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add student data
    for (const submission of submissions) {
      const totalMarks = test.questions.reduce(
        (sum, q) => sum + (q.marks || 0),
        0,
      );
      const obtainedMarks = test.questions.reduce((sum, q) => {
        const mark = q.answerMarks.find(
          (am) => am.studentId === submission.userId,
        );
        return sum + (mark?.obtainedMarks || 0);
      }, 0);

      const percentage =
        totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;
      const status = submission.answersSubmitted ? 'Submitted' : 'In Progress';

      const row = [
        submission.user.name,
        submission.user.email,
        totalMarks,
        obtainedMarks,
        `${percentage.toFixed(2)}%`,
        status,
      ];

      // Add question-wise marks
      test.questions.forEach((q) => {
        const mark = q.answerMarks.find(
          (am) => am.studentId === submission.userId,
        );
        row.push(mark?.obtainedMarks || 0);
      });

      worksheet.addRow(row);
    }

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      column.width = 15;
    });

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="test-results-${test.title.replace(/[^a-zA-Z0-9]/g, '-')}.xlsx"`,
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  }

  async downloadAllLogs(userId: number, testId: number, res: Response) {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: {
        class: true,
      },
    });

    const activityLogs = await this.prisma.activityLog.findMany({
      where: { testId },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Get user information for each log
    const userIds = [...new Set(activityLogs.map((log) => log.userId))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    // Check if user is the teacher of this test
    if (test.class?.teacherId !== userId) {
      throw new ForbiddenException('Only the test creator can download logs');
    }

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Activity Logs');

    // Add headers
    const headers = [
      'Timestamp',
      'Student Name',
      'Student Email',
      'Activity',
      'Details',
    ];
    worksheet.addRow(headers);

    // Style headers
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add log data
    for (const log of activityLogs) {
      const user = userMap.get(log.userId);
      const logData = log.logs as any;
      const row = [
        log.createdAt.toISOString(),
        user?.name || 'Unknown',
        user?.email || 'Unknown',
        logData.activity || 'Activity',
        JSON.stringify(logData, null, 2),
      ];
      worksheet.addRow(row);
    }

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      column.width = 20;
    });

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="activity-logs-${test.title.replace(/[^a-zA-Z0-9]/g, '-')}.xlsx"`,
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  }

  async downloadAllPictures(userId: number, testId: number, res: Response) {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: {
        class: true,
      },
    });

    const testPhotos = await this.prisma.testPhoto.findMany({
      where: { testId },
      include: {
        user: true,
      },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    // Check if user is the teacher of this test
    if (test.class?.teacherId !== userId) {
      throw new ForbiddenException(
        'Only the test creator can download pictures',
      );
    }

    const zip = new JSZip();

    // Add photos to ZIP
    for (const photoRecord of testPhotos) {
      const studentFolder = zip.folder(
        `${photoRecord.user.name}_${photoRecord.userId}`,
      );

      if (photoRecord.photos && Array.isArray(photoRecord.photos)) {
        photoRecord.photos.forEach((photo, index) => {
          if (Buffer.isBuffer(photo)) {
            studentFolder?.file(`photo_${index + 1}.jpg`, photo);
          }
        });
      }

      if (photoRecord.screenshots && Array.isArray(photoRecord.screenshots)) {
        photoRecord.screenshots.forEach((screenshot, index) => {
          if (Buffer.isBuffer(screenshot)) {
            studentFolder?.file(`screenshot_${index + 1}.jpg`, screenshot);
          }
        });
      }
    }

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // Set response headers
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="test-photos-${test.title.replace(/[^a-zA-Z0-9]/g, '-')}.zip"`,
    );

    // Send ZIP file
    res.send(zipBuffer);
  }
}
