# MongoDB Backup And Restore Plan

## Scope
- Database: `wertech_db`
- Environment variables used: `MONGODB_URI`
- Backup format: `mongodump --archive` (optionally `--gzip`)

## Objectives
- RPO target: 24 hours (daily backup)
- RTO target: 60 minutes

## Backup Strategy
1. Run full backup once per day.
2. Keep at least:
- 7 daily backups
- 4 weekly backups
- 3 monthly backups
3. Store backups outside the app host (object storage or separate backup server).
4. Encrypt backup storage at rest.

## Commands
- Create backup:
```powershell
npm run backup:db
```
- Restore backup:
```powershell
npm run restore:db -- -ArchivePath "C:\path\to\wertech-db-YYYYMMDD-HHMMSS.archive.gz" -Drop
```

## Verification
1. After every backup, verify archive exists and has non-trivial size.
2. Weekly: restore latest backup to a staging database and run smoke checks:
- app login works
- listings load
- messages and notifications endpoints respond
3. Record verification date, archive name, and result.

## Restore Drill (Run Monthly)
1. Select latest valid backup.
2. Restore to isolated staging DB.
3. Run API smoke suite (`npm test` in `server`).
4. Confirm data counts are sensible (users/listings/messages/notifications).
5. Document actual restore duration vs RTO target.

## Automation Notes
- Configure a scheduled task/cron job to run `npm run backup:db`.
- Rotate old backups automatically based on retention policy.
- Alert on backup failure (non-zero exit code).
