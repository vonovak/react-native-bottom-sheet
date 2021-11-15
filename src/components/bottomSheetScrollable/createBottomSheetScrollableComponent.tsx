import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import {
  FlatListProps,
  Platform,
  RefreshControlProps,
  ScrollViewProps,
  SectionListProps,
} from 'react-native';
import { useAnimatedProps, useAnimatedStyle } from 'react-native-reanimated';
import { NativeViewGestureHandler } from 'react-native-gesture-handler';
import BottomSheetDraggableView from '../bottomSheetDraggableView';
import BottomSheetRefreshControl from '../bottomSheetRefreshControl';
import {
  useScrollHandler,
  useScrollableSetter,
  useBottomSheetInternal,
} from '../../hooks';
import {
  SCROLLABLE_DECELERATION_RATE_MAPPER,
  SCROLLABLE_STATE,
  SCROLLABLE_TYPE,
} from '../../constants';
import { styles } from './styles';
import { BottomSheetScrollableProps } from './types';

// createBottomSheetScrollableComponent works with any scrollable so the interface is fairly loose
type ScrollableProps = ScrollViewProps &
  Omit<FlatListProps<any>, 'renderItem' | 'data' | 'onRefresh'> &
  Omit<SectionListProps<any>, 'renderItem' | 'sections' | 'onRefresh'> & {
    onRefresh?: RefreshControlProps['onRefresh'];
    enableFooterMarginAdjustment?: boolean;
    children?: React.ReactNode;
    RefreshControlComponent?: typeof BottomSheetRefreshControl;
  } & Pick<
    BottomSheetScrollableProps,
    'focusHook' | 'scrollEventsHandlersHook'
  >;

export function createBottomSheetScrollableComponent<T, P>(
  type: SCROLLABLE_TYPE,
  ScrollableComponent: any
) {
  return forwardRef<T, P>((props: ScrollableProps, ref) => {
    // props
    const {
      // hooks
      focusHook,
      scrollEventsHandlersHook,
      // props
      enableFooterMarginAdjustment = false,
      overScrollMode = 'never',
      keyboardDismissMode = 'interactive',
      showsVerticalScrollIndicator = true,
      style,
      refreshing,
      onRefresh,
      progressViewOffset,
      refreshControl, // deprecated
      RefreshControlComponent,
      ...rest
    } = props;
    useEffect(() => {
      if (refreshControl) {
        console.warn(
          `BottomSheet scrollComponent of type:${type}. refreshControlProp is deprecated, use RefreshControlComponent prop`
        );
      }
    }, [refreshControl]);

    //#region refs
    const nativeGestureRef = useRef<NativeViewGestureHandler>(null);
    const refreshControlGestureRef = useRef<NativeViewGestureHandler>(null);
    //#endregion

    //#region hooks
    const { scrollableRef, scrollableContentOffsetY, scrollHandler } =
      useScrollHandler(scrollEventsHandlersHook);
    const {
      enableContentPanningGesture,
      animatedFooterHeight,
      animatedScrollableState,
    } = useBottomSheetInternal();
    //#endregion

    //#region variables
    const scrollableAnimatedProps = useAnimatedProps(
      () => ({
        decelerationRate:
          SCROLLABLE_DECELERATION_RATE_MAPPER[animatedScrollableState.value],
        showsVerticalScrollIndicator: showsVerticalScrollIndicator
          ? animatedScrollableState.value === SCROLLABLE_STATE.UNLOCKED
          : showsVerticalScrollIndicator,
      }),
      [showsVerticalScrollIndicator]
    );
    //#endregion

    //#region styles
    const containerAnimatedStyle = useAnimatedStyle(
      () => ({
        marginBottom: enableFooterMarginAdjustment
          ? animatedFooterHeight.value
          : 0,
      }),
      [enableFooterMarginAdjustment]
    );
    const containerStyle = useMemo(() => {
      return enableFooterMarginAdjustment
        ? [
            ...(style ? ('length' in style ? style : [style]) : []),
            containerAnimatedStyle,
          ]
        : style;
    }, [enableFooterMarginAdjustment, style, containerAnimatedStyle]);
    //#endregion

    //#region effects
    // @ts-ignore
    useImperativeHandle(ref, () => scrollableRef.current);
    useScrollableSetter(
      scrollableRef,
      type,
      scrollableContentOffsetY,
      onRefresh !== undefined,
      focusHook
    );
    //#endregion

    //#region render
    if (Platform.OS === 'android') {
      const scrollableContent = (
        <NativeViewGestureHandler
          ref={nativeGestureRef}
          enabled={enableContentPanningGesture}
          shouldCancelWhenOutside={false}
        >
          <ScrollableComponent
            animatedProps={scrollableAnimatedProps}
            {...rest}
            scrollEventThrottle={16}
            ref={scrollableRef}
            overScrollMode={overScrollMode}
            keyboardDismissMode={keyboardDismissMode}
            onScroll={scrollHandler}
            style={containerStyle}
          />
        </NativeViewGestureHandler>
      );
      const RefreshControl =
        RefreshControlComponent || BottomSheetRefreshControl;
      return (
        <BottomSheetDraggableView
          nativeGestureRef={nativeGestureRef}
          refreshControlGestureRef={refreshControlGestureRef}
          style={styles.container}
        >
          {onRefresh ? (
            <RefreshControl
              ref={refreshControlGestureRef}
              refreshing={!!refreshing}
              onRefresh={onRefresh}
              progressViewOffset={progressViewOffset}
              style={styles.container}
            >
              {scrollableContent}
            </RefreshControl>
          ) : (
            scrollableContent
          )}
        </BottomSheetDraggableView>
      );
    }

    const refreshControlElementIOS = RefreshControlComponent ? (
      <RefreshControlComponent
        refreshing={!!refreshing}
        onRefresh={onRefresh}
        progressViewOffset={progressViewOffset}
        children={null}
      />
    ) : (
      refreshControl
    );

    return (
      <BottomSheetDraggableView
        nativeGestureRef={nativeGestureRef}
        style={styles.container}
      >
        <NativeViewGestureHandler
          ref={nativeGestureRef}
          enabled={enableContentPanningGesture}
          shouldCancelWhenOutside={false}
        >
          <ScrollableComponent
            animatedProps={scrollableAnimatedProps}
            {...rest}
            scrollEventThrottle={16}
            ref={scrollableRef}
            overScrollMode={overScrollMode}
            keyboardDismissMode={keyboardDismissMode}
            refreshing={refreshing}
            onRefresh={onRefresh}
            progressViewOffset={progressViewOffset}
            refreshControl={refreshControlElementIOS}
            onScroll={scrollHandler}
            style={containerStyle}
          />
        </NativeViewGestureHandler>
      </BottomSheetDraggableView>
    );
    //#endregion
  });
}
