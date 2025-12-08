export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData extends LoginCredentials {
  name?: string
  displayName?: string
  photoURL?: string
}
