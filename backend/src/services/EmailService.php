<?php
namespace App\Services;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

class EmailService {

    private function createMailer(): PHPMailer {
        $mail = new PHPMailer(true);

        $mail->isSMTP();
        $mail->Host       = $_ENV['MAIL_HOST']     ?? 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = $_ENV['MAIL_USERNAME']  ?? '';
        $mail->Password   = $_ENV['MAIL_PASSWORD']  ?? '';
        $mail->SMTPSecure = $_ENV['MAIL_ENCRYPTION'] === 'ssl'
                            ? PHPMailer::ENCRYPTION_SMTPS
                            : PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = (int)($_ENV['MAIL_PORT'] ?? 587);
        $mail->CharSet    = 'UTF-8';

        $mail->setFrom(
            $_ENV['MAIL_FROM_ADDRESS'] ?? '',
            $_ENV['MAIL_FROM_NAME']    ?? 'TaskManager'
        );

        return $mail;
    }

    // ── Send Task Assignment Email ────────────────────────────
    public function sendTaskAssigned(array $task, array $assignee, array $assignedBy): bool {
        try {
            $mail = $this->createMailer();

            $mail->addAddress($assignee['email'], $assignee['name']);
            $mail->Subject = "New Task Assigned: {$task['title']}";
            $mail->isHTML(true);
            $mail->Body    = $this->taskAssignedTemplate($task, $assignee, $assignedBy);
            $mail->AltBody = $this->taskAssignedPlainText($task, $assignee, $assignedBy);

            $mail->send();
            return true;

        } catch (Exception $e) {
            error_log("Email failed: " . $e->getMessage());
            return false;
        }
    }

    // ── Send Task Updated Email ───────────────────────────────
    public function sendTaskUpdated(array $task, array $assignee, array $updatedBy): bool {
        try {
            $mail = $this->createMailer();

            $mail->addAddress($assignee['email'], $assignee['name']);
            $mail->Subject = "Task Updated: {$task['title']}";
            $mail->isHTML(true);
            $mail->Body    = $this->taskUpdatedTemplate($task, $assignee, $updatedBy);
            $mail->AltBody = $this->taskUpdatedPlainText($task, $assignee, $updatedBy);

            $mail->send();
            return true;

        } catch (Exception $e) {
            error_log("Email failed: " . $e->getMessage());
            return false;
        }
    }

    // ── Task Assigned HTML Template ───────────────────────────
    private function taskAssignedTemplate(array $task, array $assignee, array $assignedBy): string {
        $appUrl     = $_ENV['APP_URL']       ?? 'http://localhost:3000';
        $title      = htmlspecialchars($task['title']);
        $priority   = ucfirst($task['priority']);
        $status     = ucfirst(str_replace('_', ' ', $task['status']));
        $dueDate    = !empty($task['due_date'])
                      ? date('F j, Y', strtotime($task['due_date']))
                      : 'No due date';
        $assigneeName  = htmlspecialchars($assignee['name']);
        $assignedByName= htmlspecialchars($assignedBy['name']);
        $description= htmlspecialchars($task['description'] ?? '');

        $priorityColor = match($task['priority']) {
            'critical' => '#dc2626',
            'high'     => '#ea580c',
            'medium'   => '#2563eb',
            default    => '#16a34a',
        };

        return <<<HTML
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">

          <!-- Wrapper -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 20px;">
            <tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

                <!-- Header -->
                <tr>
                  <td style="background:#1e3a5f;border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
                    <div style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                      ✓ TaskManager
                    </div>
                    <div style="font-size:13px;color:#7bb3e8;margin-top:4px;text-transform:uppercase;letter-spacing:1px;">
                      Task Assignment Notification
                    </div>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="background:#ffffff;padding:40px;">

                    <p style="font-size:16px;color:#0f172a;margin:0 0 8px;">
                      Hi <strong>{$assigneeName}</strong>,
                    </p>
                    <p style="font-size:15px;color:#475569;margin:0 0 32px;line-height:1.6;">
                      A new task has been assigned to you by <strong>{$assignedByName}</strong>.
                      Here are the details:
                    </p>

                    <!-- Task Card -->
                    <table width="100%" cellpadding="0" cellspacing="0"
                           style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:32px;">
                      <tr>
                        <td style="padding:24px;">

                          <div style="font-size:20px;font-weight:700;color:#0f172a;margin-bottom:20px;
                                      padding-bottom:16px;border-bottom:1px solid #e2e8f0;">
                            {$title}
                          </div>

                          <!-- Details grid -->
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding:8px 0;width:50%;vertical-align:top;">
                                <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.8px;
                                            color:#94a3b8;font-weight:600;margin-bottom:4px;">Priority</div>
                                <span style="display:inline-block;padding:3px 10px;border-radius:20px;
                                             font-size:12px;font-weight:600;text-transform:uppercase;
                                             background:{$priorityColor}20;color:{$priorityColor};
                                             border:1px solid {$priorityColor}40;">
                                  {$priority}
                                </span>
                              </td>
                              <td style="padding:8px 0;width:50%;vertical-align:top;">
                                <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.8px;
                                            color:#94a3b8;font-weight:600;margin-bottom:4px;">Status</div>
                                <div style="font-size:14px;color:#0f172a;font-weight:500;">{$status}</div>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:8px 0;vertical-align:top;" colspan="2">
                                <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.8px;
                                            color:#94a3b8;font-weight:600;margin-bottom:4px;">Due Date</div>
                                <div style="font-size:14px;color:#0f172a;font-weight:500;">{$dueDate}</div>
                              </td>
                            </tr>
                            {$this->descriptionRow($description)}
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- CTA Button -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <a href="{$appUrl}/tasks"
                             style="display:inline-block;padding:14px 32px;background:#2563eb;
                                    color:#ffffff;text-decoration:none;border-radius:8px;
                                    font-size:15px;font-weight:600;letter-spacing:0.3px;">
                            View Your Tasks →
                          </a>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background:#f8fafc;border-top:1px solid #e2e8f0;
                              border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
                    <p style="font-size:12px;color:#94a3b8;margin:0;">
                      This is an automated message from TaskManager.
                      Please do not reply to this email.
                    </p>
                  </td>
                </tr>

              </table>
            </td></tr>
          </table>

        </body>
        </html>
        HTML;
    }

    // ── Task Updated HTML Template ────────────────────────────
    private function taskUpdatedTemplate(array $task, array $assignee, array $updatedBy): string {
        $appUrl      = $_ENV['APP_URL'] ?? 'http://localhost:3000';
        $title       = htmlspecialchars($task['title']);
        $status      = ucfirst(str_replace('_', ' ', $task['status']));
        $priority    = ucfirst($task['priority']);
        $assigneeName= htmlspecialchars($assignee['name']);
        $updatedByName= htmlspecialchars($updatedBy['name']);
        $dueDate     = !empty($task['due_date'])
                       ? date('F j, Y', strtotime($task['due_date']))
                       : 'No due date';

        return <<<HTML
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 20px;">
            <tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
                <tr>
                  <td style="background:#1e3a5f;border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
                    <div style="font-size:28px;font-weight:800;color:#ffffff;">✓ TaskManager</div>
                    <div style="font-size:13px;color:#7bb3e8;margin-top:4px;text-transform:uppercase;letter-spacing:1px;">
                      Task Update Notification
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="background:#ffffff;padding:40px;">
                    <p style="font-size:16px;color:#0f172a;margin:0 0 8px;">
                      Hi <strong>{$assigneeName}</strong>,
                    </p>
                    <p style="font-size:15px;color:#475569;margin:0 0 32px;line-height:1.6;">
                      Your task has been updated by <strong>{$updatedByName}</strong>.
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0"
                           style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:32px;">
                      <tr><td style="padding:24px;">
                        <div style="font-size:20px;font-weight:700;color:#0f172a;margin-bottom:20px;
                                    padding-bottom:16px;border-bottom:1px solid #e2e8f0;">{$title}</div>
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding:8px 0;width:50%;">
                              <div style="font-size:11px;text-transform:uppercase;color:#94a3b8;
                                          font-weight:600;margin-bottom:4px;">Status</div>
                              <div style="font-size:14px;color:#0f172a;font-weight:500;">{$status}</div>
                            </td>
                            <td style="padding:8px 0;width:50%;">
                              <div style="font-size:11px;text-transform:uppercase;color:#94a3b8;
                                          font-weight:600;margin-bottom:4px;">Priority</div>
                              <div style="font-size:14px;color:#0f172a;font-weight:500;">{$priority}</div>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:8px 0;" colspan="2">
                              <div style="font-size:11px;text-transform:uppercase;color:#94a3b8;
                                          font-weight:600;margin-bottom:4px;">Due Date</div>
                              <div style="font-size:14px;color:#0f172a;font-weight:500;">{$dueDate}</div>
                            </td>
                          </tr>
                        </table>
                      </td></tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr><td align="center">
                        <a href="{$appUrl}/tasks"
                           style="display:inline-block;padding:14px 32px;background:#2563eb;
                                  color:#ffffff;text-decoration:none;border-radius:8px;
                                  font-size:15px;font-weight:600;">
                          View Your Tasks →
                        </a>
                      </td></tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="background:#f8fafc;border-top:1px solid #e2e8f0;
                              border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
                    <p style="font-size:12px;color:#94a3b8;margin:0;">
                      This is an automated message from TaskManager. Please do not reply.
                    </p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
        HTML;
    }

    // ── Plain text fallbacks ──────────────────────────────────
    private function taskAssignedPlainText(array $task, array $assignee, array $assignedBy): string {
        $dueDate = !empty($task['due_date'])
                   ? date('F j, Y', strtotime($task['due_date']))
                   : 'No due date';
        $appUrl  = $_ENV['APP_URL'] ?? 'http://localhost:3000';
        return "Hi {$assignee['name']},\n\n"
             . "A new task has been assigned to you by {$assignedBy['name']}.\n\n"
             . "Task: {$task['title']}\n"
             . "Priority: {$task['priority']}\n"
             . "Status: {$task['status']}\n"
             . "Due Date: {$dueDate}\n\n"
             . "Log in to view your task: {$appUrl}/tasks\n\n"
             . "This is an automated message from TaskManager.";
    }

    private function taskUpdatedPlainText(array $task, array $assignee, array $updatedBy): string {
        $dueDate = !empty($task['due_date'])
                   ? date('F j, Y', strtotime($task['due_date']))
                   : 'No due date';
        $appUrl  = $_ENV['APP_URL'] ?? 'http://localhost:3000';
        return "Hi {$assignee['name']},\n\n"
             . "Your task has been updated by {$updatedBy['name']}.\n\n"
             . "Task: {$task['title']}\n"
             . "Priority: {$task['priority']}\n"
             . "Status: {$task['status']}\n"
             . "Due Date: {$dueDate}\n\n"
             . "Log in to view your task: {$appUrl}/tasks\n\n"
             . "This is an automated message from TaskManager.";
    }

    // ── Helper: description row ───────────────────────────────
    private function descriptionRow(string $description): string {
        if (empty($description)) return '';
        return <<<HTML
        <tr>
          <td style="padding:8px 0;" colspan="2">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.8px;
                        color:#94a3b8;font-weight:600;margin-bottom:4px;">Description</div>
            <div style="font-size:14px;color:#475569;line-height:1.6;">{$description}</div>
          </td>
        </tr>
        HTML;
    }
}