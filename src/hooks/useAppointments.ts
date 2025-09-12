// This hook is disabled - we only focus on token authentication for now
export const useAppointments = () => {
  return {
    appointments: [],
    loading: false,
    error: null,
    fetchAppointments: () => Promise.resolve(),
    createAppointment: () => Promise.resolve(null),
    updateAppointment: () => Promise.resolve(null),
    deleteAppointment: () => Promise.resolve(false),
  }
}
