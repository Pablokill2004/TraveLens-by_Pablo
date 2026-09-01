export interface UnsplashUser {
  name: string
  username: string
  links: { html: string }
}

export interface UnsplashLocation {
  name: string | null
  city: string | null
  country: string | null
}

export interface UnsplashUrls {
  thumb: string
  small: string
  regular: string
}

export interface UnsplashPhoto {
  id: string
  slug: string
  width: number
  height: number
  altDescription: string | null
  color: string | null
  urls: UnsplashUrls
  links: { html: string; download: string }
  user: UnsplashUser
  location: UnsplashLocation | null
  tags: string[]
  likes: number
  cityName: string | null
  displayTitle: string
  displaySubtitle: string
}

export interface PaginatedPhotos {
  total: number
  totalPages: number
  page: number
  perPage: number
  results: UnsplashPhoto[]
}

export interface TravelPlanDay {
  day: number
  title: string
  description: string
}

export interface TravelPlanFoodItem {
  name: string
  description: string
}

export interface TravelPlan {
  intro: string
  days: TravelPlanDay[]
  hiddenGem: {
    name: string
    description: string
  }
  localFood: TravelPlanFoodItem[]
}

export interface ApiError {
  error: {
    message: string
    status: number
  }
}
