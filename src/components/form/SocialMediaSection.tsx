'use client';

import React from 'react';
import ValidationTextField from './ValidationTextField';
import { UseFormRegister, FieldErrors, Control, Controller, FieldError } from 'react-hook-form';
import FormSection from './FormSection';

interface SocialMediaSectionProps {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  control: Control<any>;
  handleKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

const SocialMediaSection: React.FC<SocialMediaSectionProps> = ({
  register,
  errors,
  control,
  handleKeyPress,
  disabled = false
}) => {
  return (
    <FormSection
      title="Social Media"
      description="Add links to your social media profiles"
      id="social-media-section"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        {/* Facebook */}
        <Controller
          name="facebook_url"
          control={control}
          render={({ field }) => (
            <div className="flex items-center">
              <div className="mr-2 text-blue-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/>
                </svg>
              </div>
              <ValidationTextField
                id="facebook_url"
                label="Facebook"
                {...field}
                value={field.value || ''}
                error={errors.facebook_url as FieldError}
                placeholder="facebook.com/yourbusiness"
                onKeyDown={handleKeyPress}
                helperText="Just the username or full URL"
                disabled={disabled}
              />
            </div>
          )}
        />

        {/* Instagram */}
        <Controller
          name="instagram_url"
          control={control}
          render={({ field }) => (
            <div className="flex items-center">
              <div className="mr-2 text-pink-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153.509.5.902 1.105 1.153 1.772.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 01-1.153 1.772c-.5.508-1.105.902-1.772 1.153-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 01-1.772-1.153 4.904 4.904 0 01-1.153-1.772c-.247-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428a4.88 4.88 0 011.153-1.772A4.897 4.897 0 015.45 2.525c.638-.247 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 5a5 5 0 100 10 5 5 0 000-10zm6.5-.25a1.25 1.25 0 10-2.5 0 1.25 1.25 0 002.5 0zM12 9a3 3 0 110 6 3 3 0 010-6z"/>
                </svg>
              </div>
              <ValidationTextField
                id="instagram_url"
                label="Instagram"
                {...field}
                value={field.value || ''}
                error={errors.instagram_url as FieldError}
                placeholder="instagram.com/yourbusiness"
                onKeyDown={handleKeyPress}
                helperText="Just the username or full URL"
                disabled={disabled}
              />
            </div>
          )}
        />

        {/* Pinterest */}
        <Controller
          name="pinterest_url"
          control={control}
          render={({ field }) => (
            <div className="flex items-center">
              <div className="mr-2 text-red-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.237 2.636 7.855 6.356 9.312-.088-.791-.167-2.005.035-2.868.182-.78 1.172-4.97 1.172-4.97s-.299-.6-.299-1.486c0-1.39.806-2.428 1.81-2.428.852 0 1.264.64 1.264 1.408 0 .858-.546 2.14-.828 3.33-.236.995.5 1.807 1.48 1.807 1.778 0 3.144-1.874 3.144-4.58 0-2.393-1.72-4.068-4.177-4.068-2.845 0-4.515 2.135-4.515 4.34 0 .859.331 1.781.745 2.281a.3.3 0 01.069.288l-.278 1.133c-.044.183-.145.223-.335.134-1.249-.581-2.03-2.407-2.03-3.874 0-3.154 2.292-6.052 6.608-6.052 3.469 0 6.165 2.473 6.165 5.776 0 3.447-2.173 6.22-5.19 6.22-1.013 0-1.965-.525-2.291-1.148l-.623 2.378c-.226.869-.835 1.958-1.244 2.621.937.29 1.931.446 2.962.446 5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
                </svg>
              </div>
              <ValidationTextField
                id="pinterest_url"
                label="Pinterest"
                {...field}
                value={field.value || ''}
                error={errors.pinterest_url as FieldError}
                placeholder="pinterest.com/yourbusiness"
                onKeyDown={handleKeyPress}
                helperText="Just the username or full URL"
                disabled={disabled}
              />
            </div>
          )}
        />

        {/* X/Twitter */}
        <Controller
          name="twitter_url"
          control={control}
          render={({ field }) => (
            <div className="flex items-center">
              <div className="mr-2 text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </div>
              <ValidationTextField
                id="twitter_url"
                label="X / Twitter"
                {...field}
                value={field.value || ''}
                error={errors.twitter_url as FieldError}
                placeholder="twitter.com/yourbusiness"
                onKeyDown={handleKeyPress}
                helperText="Just the username or full URL"
                disabled={disabled}
              />
            </div>
          )}
        />

        {/* YouTube */}
        <Controller
          name="youtube_url"
          control={control}
          render={({ field }) => (
            <div className="flex items-center">
              <div className="mr-2 text-red-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </div>
              <ValidationTextField
                id="youtube_url"
                label="YouTube"
                {...field}
                value={field.value || ''}
                error={errors.youtube_url as FieldError}
                placeholder="youtube.com/c/yourchannel"
                onKeyDown={handleKeyPress}
                helperText="Channel URL"
                disabled={disabled}
              />
            </div>
          )}
        />

        {/* Snapchat */}
        <Controller
          name="snapchat_url"
          control={control}
          render={({ field }) => (
            <div className="flex items-center">
              <div className="mr-2 text-yellow-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21.93 16.96c-.21-.4-.88-.57-1.26-.74-.17-.09-.35-.17-.43-.29-.08-.12-.07-.29-.05-.43l.01-.05c.03-.14.1-.42.12-.64.01-.15.01-.43-.09-.58-.1-.16-.33-.24-.57-.24-.08 0-.16.01-.22.02-.37.06-.63.22-.88.37l-.42.27c-.02-.29.02-.6.06-.9l.01-.05c.03-.14.1-.42.12-.64.01-.15.01-.43-.09-.58-.1-.16-.33-.24-.57-.24-.08 0-.16.01-.22.02-.5.08-.79.29-1.08.49l-.05.03c-.27.18-.54.35-.93.35-.17 0-.32-.04-.45-.11l.06-.18c.05-.15.11-.32.15-.51.02-.12.04-.25.05-.4 0-.15-.01-.33-.06-.48-.08-.24-.29-.42-.57-.42-.42 0-.71.17-.95.37l-.47.38c-.06-.07-.12-.13-.19-.19-.28-.22-.59-.37-.91-.37-.28 0-.56.14-.75.37-.24.29-.29.59-.19.95.4 1.52 2.15 2.73 3.19 3.31-.19.31-.45.57-.76.76-.32.2-.71.31-1.11.31-.37 0-.74-.09-1.09-.26-.12-.06-.24-.12-.36-.19-.41-.22-.79-.36-1.13-.36-.11 0-.22.02-.33.05-.39.11-.65.35-.76.7-.1.31-.06.65.1.95.46.88 1.76 1.45 2.92 1.45.08 0 .15 0 .23-.01 1.12-.05 2.1-.41 2.95-1.08.69-.54 1.24-1.27 1.67-2.19.08-.02.15-.05.23-.08.31-.12.59-.24.84-.37.15-.08.29-.16.44-.25.26-.16.49-.26.74-.26.15 0 .29.04.41.12.16.12.26.3.26.5.01.13-.05.26-.19.44z"/>
                </svg>
              </div>
              <ValidationTextField
                id="snapchat_url"
                label="Snapchat"
                {...field}
                value={field.value || ''}
                error={errors.snapchat_url as FieldError}
                placeholder="snapchat.com/add/yourusername"
                onKeyDown={handleKeyPress}
                helperText="Username or snapcode URL"
                disabled={disabled}
              />
            </div>
          )}
        />

        {/* TikTok */}
        <Controller
          name="tiktok_url"
          control={control}
          render={({ field }) => (
            <div className="flex items-center">
              <div className="mr-2 text-black">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.321 5.562a5.122 5.122 0 0 1-.443-.258 6.228 6.228 0 0 1-1.137-.966c-.375-.425-.533-.631-.533-.631V3.7h-.013a5.556 5.556 0 0 1-.553-2.4h-3.298v13.546c0 .131-.013.261-.026.392 0 .014-.2.027-.2.04a2.024 2.024 0 0 1-.733 1.181 1.998 1.998 0 0 1-1.242.443 2.024 2.024 0 0 1-1.463-.614 2.071 2.071 0 0 1-.614-1.463 2.024 2.024 0 1 1 4.048 0v.014c0-.014 0-.014 0 0v-.014a1.587 1.587 0 0 1-.053-.392H13.2a4.933 4.933 0 1 0-4.933 4.934 4.94 4.94 0 0 0 2.985-1.004v-.002a4.95 4.95 0 0 0 1.948-3.938V8.61a9.7 9.7 0 0 0 5.806 1.945V7.302c.467 0 1.966-.137 2.697-1.088.072-.092.134-.195.224-.327h-2.606z"/>
                </svg>
              </div>
              <ValidationTextField
                id="tiktok_url"
                label="TikTok"
                {...field}
                value={field.value || ''}
                error={errors.tiktok_url as FieldError}
                placeholder="tiktok.com/@yourusername"
                onKeyDown={handleKeyPress}
                helperText="Username or full profile URL"
                disabled={disabled}
              />
            </div>
          )}
        />
      </div>
    </FormSection>
  );
};

export default SocialMediaSection;
