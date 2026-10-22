// Retain an explicit failure for obsolete deployment commands so they cannot
// restore second-factor authentication after the password-only migration.
console.error('This command is retired. Staff use verified email and password. Follow DEPLOYMENT.md, step 6, to disable project MFA providers and migrate any existing staff enrollments. No authentication settings were changed.');
process.exitCode=1;
