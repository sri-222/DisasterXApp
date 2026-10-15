declare module 'react-native-image-picker' {
  export type Asset = {
    uri?: string;
    fileName?: string;
    fileSize?: number;
    type?: string;
    width?: number;
    height?: number;
  };

  export type ImageLibraryOptions = {
    mediaType?: 'photo' | 'video' | 'mixed';
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
    selectionLimit?: number;
    includeBase64?: boolean;
  };

  export type CameraOptions = ImageLibraryOptions & {
    saveToPhotos?: boolean;
  };

  export type ImagePickerResponse = {
    assets?: Asset[];
    didCancel?: boolean;
    errorCode?: string;
    errorMessage?: string;
  };

  export function launchCamera(
    options?: CameraOptions,
  ): Promise<ImagePickerResponse>;

  export function launchImageLibrary(
    options?: ImageLibraryOptions,
  ): Promise<ImagePickerResponse>;
}
