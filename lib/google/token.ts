import "server-only";

/**
 * Google Cloud Access Token 생성 (Vercel용)
 *
 * Service Account Impersonation을 사용하여 Access Token 생성
 */

const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

/**
 * Vercel 환경에서 Access Token 생성
 *
 * @returns Access Token
 */
export async function getAccessToken(): Promise<string> {
  // 로컬 개발 환경: ADC 사용 (gcloud auth application-default login)
  if (process.env.NODE_ENV === "development") {
    const { GoogleAuth } = await import("google-auth-library");
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();

    if (!tokenResponse.token) {
      throw new Error("Failed to get access token from ADC");
    }

    return tokenResponse.token;
  }

  // Vercel 환경: Service Account Impersonation
  if (!SERVICE_ACCOUNT_EMAIL) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL is required in production");
  }

  // Vercel의 OIDC 토큰 사용 (Vercel → GCP 인증)
  const vercelOidcToken = process.env.VERCEL_OIDC_TOKEN;

  if (!vercelOidcToken) {
    throw new Error("VERCEL_OIDC_TOKEN not available");
  }

  // GCP STS (Security Token Service)를 사용하여 Access Token 교환
  const stsResponse = await fetch(
    "https://sts.googleapis.com/v1/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grantType: "urn:ietf:params:oauth:grant-type:token-exchange",
        audience: `//iam.googleapis.com/projects/${process.env.GOOGLE_CLOUD_PROJECT_NUMBER}/locations/global/workloadIdentityPools/${process.env.WORKLOAD_IDENTITY_POOL}/providers/${process.env.WORKLOAD_IDENTITY_PROVIDER}`,
        scope: "https://www.googleapis.com/auth/cloud-platform",
        requestedTokenType: "urn:ietf:params:oauth:token-type:access_token",
        subjectToken: vercelOidcToken,
        subjectTokenType: "urn:ietf:params:oauth:token-type:jwt",
      }),
    }
  );

  if (!stsResponse.ok) {
    const error = await stsResponse.text();
    throw new Error(`STS token exchange failed: ${error}`);
  }

  const stsData = await stsResponse.json();

  // Service Account Impersonation
  const impersonateResponse = await fetch(
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${SERVICE_ACCOUNT_EMAIL}:generateAccessToken`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${stsData.access_token}`,
      },
      body: JSON.stringify({
        scope: ["https://www.googleapis.com/auth/cloud-platform"],
      }),
    }
  );

  if (!impersonateResponse.ok) {
    const error = await impersonateResponse.text();
    throw new Error(`Service Account impersonation failed: ${error}`);
  }

  const impersonateData = await impersonateResponse.json();
  return impersonateData.accessToken;
}
