export interface Restaurant {
  id: string;
  user_id: string;
  name: string;
  business_type?: string;
  cuisine_type?: string;
  city?: string;
  website?: string;
  tone_of_voice?: 'casual' | 'fun' | 'professional' | 'bold';
  onboarding_complete: boolean;

  plan: 'active' | 'expired' | 'free' | 'starter' | 'pro' | 'business'; // keeping legacy types for safety temporarily
  plan_start_date?: string;
  plan_end_date?: string;
  posts_used_this_month: number;
  billing_cycle_start?: string;
  created_at: string;
}

export interface BrandSettings {
  id: string;
  restaurant_id: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  font_style: string;
  updated_at: string;
}

export interface ConnectedAccount {
  id: string;
  restaurant_id: string;
  platform: 'instagram' | 'facebook' | 'gmb';
  buffer_access_token?: string;
  buffer_channel_id?: string;
  google_access_token?: string;
  google_refresh_token?: string;
  gmb_account_id?: string;
  gmb_location_id?: string;
  connected_at: string;
  is_active: boolean;
}

export interface MediaLibrary {
  id: string;
  restaurant_id: string;
  file_url: string;
  file_type: 'image' | 'video';
  file_name?: string;
  tag?: string;
  size_bytes?: number;
  uploaded_at: string;
}

export interface Post {
  id: string;
  restaurant_id: string;
  media_id?: string;
  selected_caption?: string;
  poster_url?: string;
  platforms: string[]; // 'instagram' | 'facebook' | 'gmb'
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  scheduled_at?: string;
  published_at?: string;
  buffer_post_id?: string;
  gmb_post_id?: string;
  post_type: 'image' | 'video';
  created_at: string;
}

export interface PostCaption {
  id: string;
  post_id: string;
  platform: 'instagram' | 'facebook' | 'gmb';
  caption_option_1?: string;
  caption_option_2?: string;
  caption_option_3?: string;
  selected_caption?: string;
  generated_at: string;
}

export interface Subscription {
  id: string;
  restaurant_id: string;
  plan: 'free' | 'starter' | 'pro' | 'business';
  posts_limit?: number;
  reels_included: boolean;
  gmb_included: boolean;
  multi_location: boolean;
  price_monthly: number;

  status: 'active' | 'cancelled' | 'past_due';
  current_period_end: string;
}
