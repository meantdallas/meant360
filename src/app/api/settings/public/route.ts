import { getAllSettings } from '@/lib/google-sheets';
import { jsonResponse, errorResponse } from '@/lib/api-helpers';
import type { PublicSettings, SocialLinks, FeeSettings } from '@/types';

export async function GET() {
  try {
    const settings = await getAllSettings();

    const socialLinks: SocialLinks = {
      instagram: settings['social_instagram'] || '',
      facebook: settings['social_facebook'] || '',
      linkedin: settings['social_linkedin'] || '',
      youtube: settings['social_youtube'] || '',
    };

    const feeSettings: FeeSettings = {
      squareFeePercent: parseFloat(settings['fee_square_percent'] || '0'),
      squareFeeFixed: parseFloat(settings['fee_square_fixed'] || '0'),
      paypalFeePercent: parseFloat(settings['fee_paypal_percent'] || '0'),
      paypalFeeFixed: parseFloat(settings['fee_paypal_fixed'] || '0'),
    };

    const publicSettings: PublicSettings = { socialLinks, feeSettings };
    return jsonResponse(publicSettings);
  } catch (error) {
    console.error('GET /api/settings/public error:', error);
    return errorResponse('Failed to fetch settings', 500);
  }
}
