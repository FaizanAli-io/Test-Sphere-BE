import { Index, Column, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from "typeorm";
import { Submission } from ".";

export enum LogType {
  SCREENSHOT = "SCREENSHOT",
  WEBCAM_PHOTO = "WEBCAM_PHOTO",
  FOCUS_CHANGE = "FOCUS_CHANGE",
  MOUSECLICK = "MOUSECLICK",
  KEYSTROKE = "KEYSTROKE",
  AI_INSIGHT = "AI_INSIGHT",
}

@Entity("proctoring_log")
@Index(["submissionId"])
@Index(["logType"])
export class ProctoringLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  submissionId: number;

  @Column({ type: "json", nullable: true })
  meta: any;

  @Column({
    type: "enum",
    enum: LogType,
  })
  logType: LogType;

  @ManyToOne(() => Submission, (submission) => submission.logs, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "submissionId" })
  submission: Submission;
}
