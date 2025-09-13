import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  AppointmentInstance: a
    .model({
      tenantId: a.string().required(),
      customerAccessToken: a.string().required(),
      customerUrl: a.string().required(),
      validFrom: a.datetime().required(),
      validUntil: a.datetime().required(),
      status: a.enum(['pending', 'active', 'scheduled', 'confirmed', 'rejected', 'expired', 'completed']).required(),
      fsmActivity: a.customType({
        activityId: a.string().required(),
        activityCode: a.string().required(),
        subject: a.string().required(),
        status: a.string().required(),
        businessPartner: a.string().required(),
        object: a.customType({
          objectId: a.string().required(),
          objectType: a.string().required(),
        }),
        serviceCallId: a.string(),
        serviceCallNumber: a.string(),
      }).required(),
      customerBooking: a.customType({
        customerName: a.string().required(),
        customerEmail: a.string().required(),
        customerPhone: a.string(),
        preferredTimeSlots: a.customType({
          id: a.string().required(),
          startTime: a.datetime().required(),
          endTime: a.datetime().required(),
          isAvailable: a.boolean().required(),
          isSelected: a.boolean().required(),
        }).array(),
        customerMessage: a.string(),
        specialRequirements: a.string(),
        status: a.enum(['draft', 'submitted', 'under_review', 'approved', 'rejected']).required(),
        submittedAt: a.datetime().required(),
        lastModifiedAt: a.datetime().required(),
      }),
      fsmResponse: a.customType({
        response: a.enum(['approve', 'reject']).required(),
        selectedTimeSlot: a.customType({
          id: a.string().required(),
          startTime: a.datetime().required(),
          endTime: a.datetime().required(),
          isAvailable: a.boolean().required(),
          isSelected: a.boolean().required(),
        }),
        fsmMessage: a.string(),
        technicianNotes: a.string(),
        respondedAt: a.datetime().required(),
        respondedBy: a.string().required(),
      }),
      ttl: a.integer().required(),
    })
    .authorization(allow => [allow.publicApiKey()])
    .secondaryIndexes(index => [
      index('tenantId').queryField('listInstancesByTenant'),
      index('customerAccessToken').queryField('getInstanceByToken'),
    ]),

  TenantConfig: a
    .model({
      tenantId: a.string().required(),
      accountId: a.string().required(),
      companyId: a.string().required(),
      clientId: a.string().required(),
      clientSecret: a.string().required(),
      fsmBaseUrl: a.string().required(),
      isActive: a.boolean().required(),
    })
    .authorization(allow => [allow.publicApiKey()])
    .secondaryIndexes(index => [
      index('tenantId').queryField('getTenantConfig'),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
