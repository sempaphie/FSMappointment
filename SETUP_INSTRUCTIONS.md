# FSM Appointment Setup Instructions

## 1. Create Environment File

Create a `.env.local` file in the root directory with your SAP FSM credentials:

```env
# SAP FSM Configuration
VITE_FSM_TOKEN_URL=https://eu.coresuite.com/api
VITE_SAP_ACCOUNT_ID=86810
VITE_SAP_COMPANY_ID=111214
VITE_SAP_CLIENT_ID=0001531a-fsmtable
VITE_SAP_CLIENT_SECRET=4b657b69-837c-4b00-a903-7f89161703b4
VITE_SAP_CLIENT_ID_NAME=FSMfieldplan
VITE_SAP_CLIENT_ID_VERSION=0.1
VITE_SAP_FSM_BASE_URL=https://eu.fsm.cloud.sap
VITE_SAP_SERVICE_URL=https://eu.fsm.cloud.sap/api/service-management/v2/activities/
VITE_SAP_TEST_USER=BC1164511670442EA56C76A00A9199F8
```

## 2. Test Token Authentication

1. Open your browser and go to `http://localhost:5173`
2. You'll see a "SAP FSM Authentication" card at the top
3. Click "Get Bearer Token" button
4. The app will attempt to authenticate with SAP FSM using Basic Auth
5. You'll see either:
   - ✅ **Success**: Token retrieved with details
   - ❌ **Error**: Error message with troubleshooting info

### Manual Test (Optional)

You can also test the API manually with curl:

```bash
curl --location 'https://eu.coresuite.com/api/oauth2/v1/token' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--header 'X-Account-ID: 86810' \
--header 'X-Company-ID: 111214' \
--header 'Authorization: Basic MDAwMTUzMWEtZnNtdGFibGU6NGI2NTdiNjktODM3Yy00YjAwLWE5MDMtN2Y4OTE2MTcwM2I0' \
--data-urlencode 'grant_type=client_credentials'
```

## 3. What to Look For

### Success Indicators:
- Green success message
- Access token displayed (partially hidden for security)
- Token details showing expiration, scope, etc.
- Copy button to copy the token

### Error Indicators:
- Red error message
- Detailed error information
- Missing environment variables warning

## 4. Troubleshooting

If you get errors, check:
- All environment variables are set correctly
- Network connectivity to SAP FSM
- Client credentials are valid
- Account/Company IDs are correct

## 5. Next Steps

Once token authentication is working:
- We can proceed with FSM API integration
- Set up appointment data fetching
- Build the appointment management interface
